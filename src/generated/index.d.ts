/** Generated native operation input contracts; do not edit. */
/** The registry determines operation names, requests and declared results. */
import type { Inputs0 } from "./inputs-0.js";
import type { Inputs1 } from "./inputs-1.js";
import type { Inputs2 } from "./inputs-2.js";
import type { Inputs3 } from "./inputs-3.js";
import type { Inputs4 } from "./inputs-4.js";
import type { Inputs5 } from "./inputs-5.js";
import type { Inputs6 } from "./inputs-6.js";
import type { Inputs7 } from "./inputs-7.js";
import type { Inputs8 } from "./inputs-8.js";
import type { Inputs9 } from "./inputs-9.js";
import type { Inputs10 } from "./inputs-10.js";
import type { Inputs11 } from "./inputs-11.js";
import type { Inputs12 } from "./inputs-12.js";
import type { Inputs13 } from "./inputs-13.js";
import type { Inputs14 } from "./inputs-14.js";
import type { Inputs15 } from "./inputs-15.js";
import type { Inputs16 } from "./inputs-16.js";
export type OperationInputs = Inputs0 &
  Inputs1 &
  Inputs2 &
  Inputs3 &
  Inputs4 &
  Inputs5 &
  Inputs6 &
  Inputs7 &
  Inputs8 &
  Inputs9 &
  Inputs10 &
  Inputs11 &
  Inputs12 &
  Inputs13 &
  Inputs14 &
  Inputs15 &
  Inputs16;
export type OperationName = keyof OperationInputs;
export type OperationCall<N extends OperationName> = {
  name: N;
  arguments: OperationInputs[N];
};
export interface OperationOutputs {
  "automation.validate_flow": { revision: number; saved: false; valid: true };
}
