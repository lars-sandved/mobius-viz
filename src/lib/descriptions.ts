export interface MachineDescription {
	title: string;
	summary: string;
	tapeFormat: string;
	watchFor: string;
	interpretTape?: (left: number[], right: number[], blankSymbol: number) => string;
}

function fullTape(left: number[], right: number[]): number[] {
	return [...[...left].reverse(), ...right];
}

export const descriptions: Record<string, MachineDescription> = {
	'BB(3) — Busy Beaver 3': {
		title: 'Busy Beaver (3 states)',
		summary: 'The 3-state busy beaver champion. Starting from a blank tape, this machine writes the maximum possible number of 1s before halting — using only 3 non-halt states and 2 symbols.',
		tapeFormat: 'Starts blank (all 0s). Symbols: 0 = blank, 1 = mark.',
		watchFor: 'Watch the head bounce between states, writing marks. It writes exactly 6 ones in 13 steps — the proven maximum for any 3-state, 2-symbol Turing machine.',
		interpretTape(left, right, blankSymbol) {
			const ones = fullTape(left, right).filter(c => c === 1).length;
			return `${ones} mark${ones !== 1 ? 's' : ''} written`;
		},
	},
	'Unary Addition': {
		title: 'Unary Adder',
		summary: 'Adds two numbers represented in unary (tally marks). The input is two groups of 1s separated by a 2. The machine merges them into a single group, computing their sum.',
		tapeFormat: 'Unary encoding: the number n is represented as n consecutive 1s. Input: [n ones] 2 [m ones]. Output: [n+m ones].',
		watchFor: 'The machine replaces the separator with a 1, joining the two groups, then cleans up the extra mark at the end.',
		interpretTape(left, right, blankSymbol) {
			const tape = fullTape(left, right).filter(c => c !== blankSymbol);
			const sepIdx = tape.indexOf(2);
			if (sepIdx !== -1) {
				const a = tape.slice(0, sepIdx).filter(c => c === 1).length;
				const b = tape.slice(sepIdx + 1).filter(c => c === 1).length;
				return `${a} + ${b}`;
			}
			const ones = tape.filter(c => c === 1).length;
			return `= ${ones}`;
		},
	},
	'Unary Parity': {
		title: 'Unary Parity Checker',
		summary: 'Determines whether a unary number is odd or even. Scans across the input, toggling between two states for each mark encountered.',
		tapeFormat: 'Input: a string of 1s in unary. Output: 1 if odd, 0 if even.',
		watchFor: 'Watch the state alternate with each 1 read — the machine is essentially counting modulo 2.',
		interpretTape(left, right, blankSymbol) {
			const tape = fullTape(left, right);
			const ones = tape.filter(c => c === 1).length;
			return `${ones} (${ones % 2 === 1 ? 'odd' : 'even'})`;
		},
	},
	'Binary Addition': {
		title: 'Binary Adder',
		summary: 'Adds two binary numbers on the tape. A more complex machine with carry propagation, demonstrating that the Möbius framework handles multi-symbol, multi-state machines.',
		tapeFormat: 'Binary encoding with separator symbols. Multiple tape symbols represent digits and carry states.',
		watchFor: 'This machine takes 40 steps — notice how the Shear expansion (Φ) accumulates a much longer matrix chain than the simpler machines.',
		interpretTape(left, right, blankSymbol) {
			const tape = fullTape(left, right).filter(c => c !== blankSymbol);
			if (tape.length === 0) return '';
			// Encoding: 1=bit0, 2=bit1, 3=separator
			const sepIdx = tape.indexOf(3);
			const parseBin = (syms: number[]) => {
				const bits = syms.filter(c => c === 1 || c === 2).map(c => c - 1);
				if (bits.length === 0) return 0;
				return parseInt([...bits].reverse().join(''), 2);
			};
			if (sepIdx !== -1) {
				const a = parseBin(tape.slice(0, sepIdx));
				const b = parseBin(tape.slice(sepIdx + 1));
				return `${a} + ${b}`;
			}
			const result = parseBin(tape);
			return `= ${result}`;
		},
	},
};
