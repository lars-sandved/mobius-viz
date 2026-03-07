import type { Step, SubStep } from './types';

/** Multiply two 2x2 integer matrices */
export function matMul(a: number[][], b: number[][]): number[][] {
	return [
		[a[0][0]*b[0][0] + a[0][1]*b[1][0], a[0][0]*b[0][1] + a[0][1]*b[1][1]],
		[a[1][0]*b[0][0] + a[1][1]*b[1][0], a[1][0]*b[0][1] + a[1][1]*b[1][1]],
	];
}

/** Identity matrix */
export const IDENTITY: number[][] = [[1,0],[0,1]];

/** Push matrix P_k = [[k,1],[1,0]] */
export function pushMatrix(k: number): number[][] {
	return [[k, 1], [1, 0]];
}

/** Pop matrix Q_k = [[0,1],[1,-k]] */
export function popMatrix(k: number): number[][] {
	return [[0, 1], [1, -k]];
}

/** Convert external symbol to internal (shift +1) */
function internal(ext: number): number {
	return ext + 1;
}

/**
 * Decompose a TM step into its constituent Möbius sub-operations.
 * 
 * Right move: pop read from R (Q_a), push write onto L (P_w)
 * Left move:  pop read from R (Q_a), push write onto R (P_w), 
 *             push popped-left onto R (P_b), pop popped-left from L (Q_b)
 */
export function decomposeStep(step: Step, blankSymbol: number): SubStep[] {
	const a = internal(step.readSymbol);   // internal read symbol
	const w = internal(step.writeSymbol);  // internal write symbol
	const subs: SubStep[] = [];

	if (step.move === 'R') {
		subs.push({
			label: `Pop ${step.readSymbol} from right stack`,
			matrixName: `Q${subscript(a)}`,
			matrix: popMatrix(a),
			target: 'right',
			operation: 'pop',
			symbol: a,
		});
		subs.push({
			label: `Push ${step.writeSymbol} onto left stack`,
			matrixName: `P${subscript(w)}`,
			matrix: pushMatrix(w),
			target: 'left',
			operation: 'push',
			symbol: w,
		});
	} else {
		// Left move: need to figure out what was popped from left
		// The popped-left symbol is the top of preLeft (or blank)
		const bExt = step.preLeft.length > 0 ? step.preLeft[0] : blankSymbol;
		const b = internal(bExt);

		subs.push({
			label: `Pop ${step.readSymbol} from right stack`,
			matrixName: `Q${subscript(a)}`,
			matrix: popMatrix(a),
			target: 'right',
			operation: 'pop',
			symbol: a,
		});
		subs.push({
			label: `Push ${step.writeSymbol} onto right stack`,
			matrixName: `P${subscript(w)}`,
			matrix: pushMatrix(w),
			target: 'right',
			operation: 'push',
			symbol: w,
		});
		subs.push({
			label: `Push ${bExt} (from left) onto right stack`,
			matrixName: `P${subscript(b)}`,
			matrix: pushMatrix(b),
			target: 'right',
			operation: 'push',
			symbol: b,
		});
		subs.push({
			label: `Pop ${bExt} from left stack`,
			matrixName: `Q${subscript(b)}`,
			matrix: popMatrix(b),
			target: 'left',
			operation: 'pop',
			symbol: b,
		});
	}

	return subs;
}

/** Unicode subscript digits */
function subscript(n: number): string {
	const subs = '₀₁₂₃₄₅₆₇₈₉';
	return String(n).split('').map(d => subs[parseInt(d)] || d).join('');
}

/**
 * Build a narration string for a step.
 */
export function narrateStep(step: Step, blankSymbol: number): string {
	const dir = step.move === 'R' ? 'right' : 'left';
	const a = internal(step.readSymbol);
	const w = internal(step.writeSymbol);

	let narration = `In state ${step.preState}, read symbol ${step.readSymbol} (internal: ${a}). `;
	narration += `Write ${step.writeSymbol} (internal: ${w}), move ${dir}, go to state ${step.postState}.\n\n`;

	if (step.move === 'R') {
		narration += `Right move decomposes into two operations:\n`;
		narration += `  1. Pop from right: apply Q${subscript(a)} (removes ${step.readSymbol} from right CF)\n`;
		narration += `  2. Push onto left: apply P${subscript(w)} (prepends ${step.writeSymbol} to left CF)`;
	} else {
		const bExt = step.preLeft.length > 0 ? step.preLeft[0] : blankSymbol;
		const b = internal(bExt);
		narration += `Left move decomposes into four operations:\n`;
		narration += `  1. Pop from right: apply Q${subscript(a)} on R (removes read symbol)\n`;
		narration += `  2. Push onto right: apply P${subscript(w)} on R (writes new symbol)\n`;
		narration += `  3. Push onto right: apply P${subscript(b)} on R (moves left-top to right)\n`;
		narration += `  4. Pop from left: apply Q${subscript(b)} on L (removes top of left)`;
	}

	return narration;
}

/**
 * Build the continued fraction notation string from a stack of symbols.
 * e.g. [2, 1, 1] with blank=0 → "2 + 1/(1 + 1/(1 + 1/...))"
 * Returns an array of {value, depth} for rendering nested fractions.
 */
export interface CFLayer {
	value: number;
	depth: number;
	isLast: boolean;
}

export function buildCFLayers(stack: number[], blankSymbol: number, maxDepth: number = 5): CFLayer[] {
	// Internal symbols (stack is in external), but we display external
	// The CF is: stack[0] + 1/(stack[1] + 1/(stack[2] + ...))
	// After the explicit symbols, it continues with blank (= golden ratio tail)
	const layers: CFLayer[] = [];
	const len = Math.min(stack.length, maxDepth);
	
	for (let i = 0; i < len; i++) {
		layers.push({
			value: stack[i],
			depth: i,
			isLast: i === len - 1,
		});
	}

	return layers;
}

/**
 * Compute accumulated Φ_R and Φ_L up to (but not including) stepIndex.
 */
export function computeAccumulatedPhi(
	trace: Step[],
	upTo: number,
	blankSymbol: number,
): { phiR: number[][]; phiL: number[][]; chainR: string[]; chainL: string[] } {
	let phiR = [...IDENTITY.map(r => [...r])];
	let phiL = [...IDENTITY.map(r => [...r])];
	const chainR: string[] = [];
	const chainL: string[] = [];

	for (let i = 0; i < upTo && i < trace.length; i++) {
		const s = trace[i];
		const a = internal(s.readSymbol);
		const w = internal(s.writeSymbol);

		if (s.move === 'R') {
			// Q_a on R, P_w on L
			phiR = matMul(phiR, popMatrix(a));
			phiL = matMul(phiL, pushMatrix(w));
			chainR.push(`Q${subscript(a)}`);
			chainL.push(`P${subscript(w)}`);
		} else {
			const bExt = s.preLeft.length > 0 ? s.preLeft[0] : blankSymbol;
			const b = internal(bExt);
			// Q_a, P_w, P_b on R; Q_b on L
			phiR = matMul(phiR, popMatrix(a));
			phiR = matMul(phiR, pushMatrix(w));
			phiR = matMul(phiR, pushMatrix(b));
			phiL = matMul(phiL, popMatrix(b));
			chainR.push(`Q${subscript(a)}`);
			chainR.push(`P${subscript(w)}`);
			chainR.push(`P${subscript(b)}`);
			chainL.push(`Q${subscript(b)}`);
		}
	}

	return { phiR, phiL, chainR, chainL };
}
