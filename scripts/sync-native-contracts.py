"""Import reviewed native registry outputs and the existing guest adapter with exact source provenance."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--ref', default='HEAD')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    def git(*values):
        return subprocess.check_output(['git', '-C', str(args.source), *values])
    if args.check:
        metadata = json.loads((ROOT / 'PROVENANCE.json').read_text())
        ref = metadata['sourceCommit']
        mappings = metadata['files']
    else:
        ref = git('rev-parse', args.ref).decode().strip()
        paths = git('ls-tree', '-r', '--name-only', ref, 'frontend/src/shared/operations').decode().splitlines()
        mappings = {str('src/generated/' + Path(p).name.replace('.ts', '.d.ts')): {'source': p}
                    for p in paths if p.endswith('.ts')}
        mappings.update({'contracts/' + name: {'source': 'extensions/sdk/generated/' + name}
                         for name in ['operations.json', 'openapi.json', 'operations.wit']})
        mappings['src/guest.js'] = {'source': 'extensions/sdk/browser.js'}
        mappings['LICENSE'] = {'source': 'LICENSE'}
        metadata = {'sourceRepository': 'https://github.com/veyndo/veyndo', 'sourceCommit': ref,
                    'contractScope': 'Native input contracts; domain outputs are JSON until declared by their owner', 'files': mappings}
    for destination, entry in mappings.items():
        original = git('show', ref + ':' + entry['source'])
        content = original
        if destination.endswith('.d.ts'):
            content = re.sub(rb'from "(\./[^".]+(?:-[0-9]+)?)"', rb'from "\1.js"', content)
        digest = hashlib.sha256(content).hexdigest()
        target = ROOT / destination
        if args.check:
            assert entry['sourceSha256'] == hashlib.sha256(original).hexdigest(), destination
            assert entry['sha256'] == digest and target.read_bytes() == content, destination
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
            entry['sha256'] = digest
            entry['sourceSha256'] = hashlib.sha256(original).hexdigest()
            if destination.endswith('.d.ts'):
                entry['adaptation'] = 'Declaration suffix and explicit .js import specifiers for Node ESM'
    if not args.check:
        (ROOT / 'PROVENANCE.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(f'PASS {len(mappings)} exact native source exports at {ref}')


if __name__ == '__main__':
    main()
