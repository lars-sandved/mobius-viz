export interface Trace {
	machine: {
		alphabetSize: number;
		blankSymbol: number;
		states: string[];
		startState: string;
		haltStates: string[];
		transitions: {
			state: string;
			read: number;
			write: number;
			move: string;
			nextState: string;
		}[];
	};
	result: {
		status: string;
		steps: number;
		finalLeft: number[];
		finalRight: number[];
		finalState: string;
	};
	emet: {
		aleph: boolean;
		mem: boolean;
		tav: boolean;
		isEmet: boolean;
		notes: string[];
	};
	shear: {
		phiR: number[][] | null;
		phiL: number[][] | null;
	};
	trace: Step[];
}

export interface Step {
	step: number;
	preState: string;
	postState: string;
	readSymbol: number;
	writeSymbol: number;
	move: string;
	shearFactor: { kind: string; k: number };
	matrix: number[][];
	preLeft: number[];
	preRight: number[];
	postLeft: number[];
	postRight: number[];
	cf: {
		preLeft: string | null;
		preRight: string | null;
		postLeft: string | null;
		postRight: string | null;
	};
	selectorMode: string;
}

// Derived sub-step for the decomposition view
export interface SubStep {
	label: string;           // e.g. "Pop 1 from right"
	matrixName: string;      // e.g. "Q₁"
	matrix: number[][];      // the 2x2 matrix
	target: 'left' | 'right';
	operation: 'push' | 'pop';
	symbol: number;          // internal symbol k
}
