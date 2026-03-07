export interface MachineDescription {
	title: string;
	summary: string;
	tapeFormat: string;
	watchFor: string;
}

export const descriptions: Record<string, MachineDescription> = {
	'BB(3) — Busy Beaver 3': {
		title: 'Busy Beaver (3 states)',
		summary: 'The 3-state busy beaver champion. Starting from a blank tape, this machine writes the maximum possible number of 1s before halting — using only 3 non-halt states and 2 symbols.',
		tapeFormat: 'Starts blank (all 0s). Symbols: 0 = blank, 1 = mark.',
		watchFor: 'Watch the head bounce between states, writing marks. It writes exactly 6 ones in 13 steps — the proven maximum for any 3-state, 2-symbol Turing machine.',
	},
	'Unary Addition': {
		title: 'Unary Adder',
		summary: 'Adds two numbers represented in unary (tally marks). The input is two groups of 1s separated by a 0. The machine merges them into a single group, computing their sum.',
		tapeFormat: 'Unary encoding: the number n is represented as n consecutive 1s. Input: [n ones] 0 [m ones]. Output: [n+m ones].',
		watchFor: 'The machine replaces the separator 0 with a 1, joining the two groups, then cleans up the extra mark at the end.',
	},
	'Unary Parity': {
		title: 'Unary Parity Checker',
		summary: 'Determines whether a unary number is odd or even. Scans across the input, toggling between two states for each mark encountered.',
		tapeFormat: 'Input: a string of 1s in unary. Output: 1 if odd, 0 if even.',
		watchFor: 'Watch the state alternate with each 1 read — the machine is essentially counting modulo 2.',
	},
	'Binary Addition': {
		title: 'Binary Adder',
		summary: 'Adds two binary numbers on the tape. A more complex machine with carry propagation, demonstrating that the Möbius framework handles multi-symbol, multi-state machines.',
		tapeFormat: 'Binary encoding with separator symbols. Multiple tape symbols represent digits and carry states.',
		watchFor: 'This machine takes 40 steps — notice how the Shear expansion (Φ) accumulates a much longer matrix chain than the simpler machines.',
	},
};
