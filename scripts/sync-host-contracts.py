"""Generate host DTOs and operation names from the same versioned contract consumed by the native callback."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
ROOT = Path(__file__).resolve().parents[1]

def ts(schema):
    if 'enum' in schema: return ' | '.join(json.dumps(x) for x in schema['enum'])
    kind = schema.get('type')
    if kind == 'object':
        if 'properties' not in schema: return 'Record<string, JsonValue>'
        required = schema.get('required', [])
        return '{ ' + '; '.join(json.dumps(k) + ('' if k in required else '?') + ': ' + ts(v) for k,v in schema['properties'].items()) + ' }'
    if kind == 'array': return 'Array<' + ts(schema['items']) + '>'
    return {'string':'string','integer':'number','number':'number','boolean':'boolean','null':'null'}[kind]

def main():
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path);p.add_argument('--ref',default='HEAD');p.add_argument('--check',action='store_true');args=p.parse_args()
    path=ROOT/'contracts/host-exchange-v1.json'
    if args.source:
        ref=subprocess.check_output(['git','-C',str(args.source),'rev-parse',args.ref],text=True).strip()
        raw=subprocess.check_output(['git','-C',str(args.source),'show',ref+':extensions/sdk/host-exchange-v1.json'])
        if not args.check:
            path.write_bytes(raw)
            (ROOT/'HOST-PROVENANCE.json').write_text(json.dumps({'repository':'https://github.com/veyndo/veyndo','commit':ref,'source':'extensions/sdk/host-exchange-v1.json','sha256':hashlib.sha256(raw).hexdigest()},indent=2)+'\n')
        else: assert path.read_bytes()==raw
    data=json.loads(path.read_text());operations=data['operations']
    declarations='/** Generated from contracts/host-exchange-v1.json; do not edit. */\nimport type { JsonValue } from "./value.js";\nexport interface HostInputs {\n'+''.join('  '+json.dumps(k)+': '+ts(v['inputSchema'])+';\n' for k,v in operations.items())+'}\n'
    names='/** Generated host operation names; no independent dispatch registry. */\nexport const operations = Object.freeze('+json.dumps(list(operations))+');\n'
    for name,text in [('src/generated/host-inputs.d.ts',declarations),('src/generated/host-operations.js',names)]:
        target=ROOT/name
        if args.check: assert target.read_text()==text,name+' drift'
        else: target.write_text(text)
    meta=json.loads((ROOT/'HOST-PROVENANCE.json').read_text());assert meta['sha256']==hashlib.sha256(path.read_bytes()).hexdigest()
    print('PASS versioned host contract, source provenance and generated inputs/operation names')
if __name__=='__main__': main()
