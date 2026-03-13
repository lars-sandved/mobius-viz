<script lang="ts">
	interface Transition {
		state: string;
		read: number;
		write: number;
		move: string;
		nextState: string;
	}

	interface Props {
		alphabetSize: number;
		numStates: number;
		stateIndex: number;
		readSymbol: number;
		transitions: Transition[];
		states: string[];
		depth?: number;
	}

	let { alphabetSize, numStates, stateIndex, readSymbol, transitions, states, depth = 3 }: Props = $props();

	// Factor N into primes
	function primeFactors(n: number): number[] {
		const factors: number[] = [];
		let x = n;
		for (let p = 2; p * p <= x; p++) {
			if (x % p === 0) {
				factors.push(p);
				while (x % p === 0) x /= p;
			}
		}
		if (x > 1) factors.push(x);
		return factors;
	}

	// Linear encoding for a (read, stateIdx) pair → unique index in [0, N)
	// Using u = stateIdx * d + read (not CRT, which fails when gcd(d,q) > 1)
	// This always gives a unique value, and at prime d the bottom digit = read symbol
	function encodeTransition(read: number, stateIdx: number, d: number): number {
		return stateIdx * d + read;
	}

	// Get the active path digits for a residue u at prime p, depth levels
	function activePath(u: number, p: number, levels: number): number[] {
		const digits: number[] = [];
		let val = u;
		for (let i = 0; i < levels; i++) {
			digits.push(val % p);
			val = Math.floor(val / p);
		}
		return digits;
	}

	// Compute transition map: which transitions land at which encoded index
	function transitionMap(d: number, trans: Transition[], stateNames: string[]): Map<number, Transition> {
		const map = new Map<number, Transition>();
		for (const t of trans) {
			const si = stateNames.indexOf(t.state);
			if (si >= 0) {
				const u = encodeTransition(t.read, si, d);
				map.set(u, t);
			}
		}
		return map;
	}

	// Node in the tree
	interface TreeNode {
		id: string;
		digit: number;
		residue: number;  // full residue mod p^(level+1)
		level: number;
		x: number;
		y: number;
		isActive: boolean;
		children: TreeNode[];
		transition?: Transition;
	}

	// Build tree for a prime p
	function buildTree(p: number, levels: number, activeDigits: number[], tMap: Map<number, Transition>, N: number): TreeNode {
		const root: TreeNode = { id: 'root', digit: -1, residue: 0, level: -1, x: 0, y: 0, isActive: true, children: [] };

		function build(parent: TreeNode, level: number, residuePrefix: number, powerSoFar: number): void {
			const power = powerSoFar * p;
			for (let d = 0; d < p; d++) {
				const residue = residuePrefix + d * powerSoFar;
				const isActive = level < activeDigits.length && activeDigits[level] === d && parent.isActive;
				const node: TreeNode = {
					id: `${level}-${residue}`,
					digit: d,
					residue,
					level,
					x: 0, y: 0,
					isActive,
					children: [],
				};

				// At the deepest level, check if any transition maps here
				if (level === levels - 1) {
					// Check all residues mod N that are ≡ residue mod p^levels
					for (const [u, t] of tMap) {
						if (u % power === residue) {
							node.transition = t;
							break;
						}
					}
				}

				parent.children.push(node);

				if (level < levels - 1) {
					build(node, level + 1, residue, power);
				}
			}
		}

		build(root, 0, 0, 1);
		return root;
	}

	// Layout the tree with x,y positions
	function layoutTree(root: TreeNode, width: number, height: number, p: number, levels: number): void {
		const levelHeight = height / (levels + 0.5);
		let leafIndex = 0;
		const totalLeaves = Math.pow(p, levels);
		const leafWidth = width / totalLeaves;

		function assignPositions(node: TreeNode, level: number, leftBound: number, rightBound: number): void {
			if (node.children.length === 0) {
				// Leaf
				node.x = leftBound + (rightBound - leftBound) / 2;
				node.y = (level + 1) * levelHeight;
				return;
			}

			const childWidth = (rightBound - leftBound) / node.children.length;
			for (let i = 0; i < node.children.length; i++) {
				assignPositions(node.children[i], level + 1, leftBound + i * childWidth, leftBound + (i + 1) * childWidth);
			}

			// Parent at center of children
			const firstChild = node.children[0];
			const lastChild = node.children[node.children.length - 1];
			node.x = (firstChild.x + lastChild.x) / 2;
			node.y = level >= 0 ? (level + 1) * levelHeight : levelHeight * 0.3;
		}

		// Root position
		root.x = width / 2;
		root.y = levelHeight * 0.3;

		const childWidth = width / root.children.length;
		for (let i = 0; i < root.children.length; i++) {
			assignPositions(root.children[i], 0, i * childWidth, (i + 1) * childWidth);
		}
	}

	// Flatten tree for rendering
	function flattenTree(root: TreeNode): { nodes: TreeNode[], edges: { from: TreeNode, to: TreeNode }[] } {
		const nodes: TreeNode[] = [];
		const edges: { from: TreeNode, to: TreeNode }[] = [];

		function walk(node: TreeNode): void {
			if (node.level >= 0) nodes.push(node);
			for (const child of node.children) {
				edges.push({ from: node, to: child });
				walk(child);
			}
		}

		nodes.push(root);
		walk(root);
		return { nodes, edges };
	}

	// Color for a transition
	function transitionColor(t: Transition | undefined): string {
		if (!t) return '#374151'; // gray-700
		if (t.move === 'R') return '#6366f1'; // indigo-500
		return '#10b981'; // emerald-500
	}

	// Derived computations
	let N = $derived(alphabetSize * numStates);
	let primes = $derived(primeFactors(N));
	let currentResidue = $derived(encodeTransition(readSymbol, stateIndex, alphabetSize));
	let tMap = $derived(transitionMap(alphabetSize, transitions, states));

	// Tree dimensions per prime
	const TREE_WIDTH = 180;
	const TREE_HEIGHT = 160;
	const NODE_R = 6;

	// Build and layout trees
	let trees = $derived.by(() => {
		return primes.map(p => {
			const digits = activePath(currentResidue, p, depth);
			const tree = buildTree(p, depth, digits, tMap, N);
			layoutTree(tree, TREE_WIDTH, TREE_HEIGHT, p, depth);
			const { nodes, edges } = flattenTree(tree);
			return { prime: p, digits, tree, nodes, edges, residue: currentResidue % p };
		});
	});

	// Move color for the current step
	function nodeStrokeColor(node: TreeNode): string {
		if (node.level === -1) return node.isActive ? '#f59e0b' : '#4b5563'; // root: amber or gray
		if (node.isActive) return '#f59e0b'; // amber-500
		if (node.transition) return transitionColor(node.transition);
		return '#374151';
	}

	function nodeFillColor(node: TreeNode): string {
		if (node.level === -1) return node.isActive ? '#78350f' : '#1f2937';
		if (node.isActive) return '#451a03'; // amber-950
		if (node.transition) return '#1e1b4b20';
		return '#111827';
	}

	function edgeColor(from: TreeNode, to: TreeNode): string {
		if (from.isActive && to.isActive) return '#f59e0b'; // amber
		return '#1f2937'; // gray-800
	}

	function edgeWidth(from: TreeNode, to: TreeNode): number {
		return from.isActive && to.isActive ? 2.5 : 1;
	}
</script>

<div class="bg-gray-900 rounded-lg border border-gray-800 p-4">
	<h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">⑥ p-adic Structure</h2>
	<p class="text-[10px] text-gray-600 mb-3">
		N = {alphabetSize}×{numStates} = {N} = {primes.map(p => {
			let count = 0; let x = N; while (x % p === 0) { count++; x /= p; }
			return count > 1 ? `${p}<sup>${count}</sup>` : `${p}`;
		}).join('×')} — each prime gives a different view of the computation.
		Transition index u = {stateIndex}×{alphabetSize} + {readSymbol} = {currentResidue}.
	</p>

	<div class="flex items-start justify-center gap-6 overflow-x-auto">
		{#each trees as t}
			<div class="flex flex-col items-center">
				<!-- Prime label -->
				<div class="mb-1 text-center">
					<span class="text-sm font-mono font-bold text-violet-400">ℤ<sub>{t.prime}</sub></span>
					<span class="text-[10px] text-gray-500 ml-1">
						u ≡ {t.residue} <span class="text-gray-600">(mod {t.prime})</span>
					</span>
				</div>

				<!-- Tree SVG -->
				<svg width={TREE_WIDTH} height={TREE_HEIGHT} class="overflow-visible">
					<!-- Edges -->
					{#each t.edges as edge}
						<line
							x1={edge.from.x} y1={edge.from.y}
							x2={edge.to.x} y2={edge.to.y}
							stroke={edgeColor(edge.from, edge.to)}
							stroke-width={edgeWidth(edge.from, edge.to)}
							opacity={edge.from.isActive && edge.to.isActive ? 1 : 0.4}
						/>
					{/each}

					<!-- Nodes -->
					{#each t.nodes as node}
						<g>
							<!-- Node circle -->
							<circle
								cx={node.x} cy={node.y}
								r={node.isActive ? NODE_R + 1.5 : NODE_R}
								fill={nodeFillColor(node)}
								stroke={nodeStrokeColor(node)}
								stroke-width={node.isActive ? 2 : 1}
								opacity={node.isActive ? 1 : 0.5}
							/>
							<!-- Digit label inside node -->
							{#if node.level >= 0}
								<text
									x={node.x} y={node.y + 3.5}
									text-anchor="middle"
									class="text-[9px] font-mono select-none pointer-events-none"
									fill={node.isActive ? '#fbbf24' : '#6b7280'}
								>{node.digit}</text>
							{:else}
								<!-- Root -->
								<text
									x={node.x} y={node.y + 3}
									text-anchor="middle"
									class="text-[8px] font-mono select-none pointer-events-none"
									fill="#9ca3af"
								>ℤ</text>
							{/if}

							<!-- Transition indicator at leaves -->
							{#if node.transition && node.level === depth - 1}
								<circle
									cx={node.x} cy={node.y + NODE_R + 6}
									r={3}
									fill={transitionColor(node.transition)}
									opacity="0.7"
								/>
								<text
									x={node.x} y={node.y + NODE_R + 8}
									text-anchor="middle"
									class="text-[6px] font-mono select-none pointer-events-none"
									fill="white"
								>{node.transition.move === 'R' ? '→' : '←'}</text>
							{/if}
						</g>
					{/each}

					<!-- Active path annotation -->
					<text
						x={TREE_WIDTH / 2} y={TREE_HEIGHT + 10}
						text-anchor="middle"
						class="text-[9px] font-mono select-none"
						fill="#f59e0b"
						opacity="0.8"
					>
						[{t.digits.join(', ')}]
					</text>
				</svg>

				<!-- Digit expansion -->
				<div class="mt-1 text-[9px] text-gray-600 font-mono text-center">
					{currentResidue} = {t.digits.map((d, i) => `${d}·${t.prime}${i > 0 ? `^${i}` : ''}`).join(' + ')}
				</div>
			</div>
		{/each}
	</div>

	<!-- Legend -->
	<div class="flex items-center justify-center gap-4 mt-3 text-[9px] text-gray-500">
		<span class="flex items-center gap-1">
			<span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
			Active path
		</span>
		<span class="flex items-center gap-1">
			<span class="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
			Right move
		</span>
		<span class="flex items-center gap-1">
			<span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
			Left move
		</span>
	</div>
</div>
