<script lang="ts">
	import type { Trace, Step } from '$lib/types';
	import { decomposeStep, narrateStep, buildCFLayers, computeAccumulatedPhi, matMul, IDENTITY } from '$lib/mobius';
	import { descriptions } from '$lib/descriptions';
	import AdelicDiagram from '$lib/AdelicDiagram.svelte';
	import PadicTrees from '$lib/PadicTrees.svelte';
	import bb3 from '$lib/traces/bb3_trace.json';
	import unaryAdd from '$lib/traces/unary_add_trace.json';
	import unaryParity from '$lib/traces/unary_parity_trace.json';
	import binaryAdd from '$lib/traces/binary_add_trace.json';
	import sweeper from '$lib/traces/sweeper_6_2_trace.json';
	import bouncer from '$lib/traces/bouncer_15_2_trace.json';
	import rogozhin from '$lib/traces/rogozhin_2_3_trace.json';

	const machines: Record<string, Trace> = {
		'BB(3) — Busy Beaver 3': bb3 as Trace,
		'Unary Addition': unaryAdd as Trace,
		'Unary Parity': unaryParity as Trace,
		'Binary Addition': binaryAdd as Trace,
		'Sweeper (6,2)': sweeper as Trace,
		'Bouncer (15,2)': bouncer as Trace,
		'Rogozhin (2,3) — Universal TM': rogozhin as Trace,
	};

	let selectedMachine = $state('BB(3) — Busy Beaver 3');
	let currentStep = $state(0);
	let playing = $state(false);
	let speed = $state(700);
	let playInterval: ReturnType<typeof setInterval> | null = null;

	let trace = $derived(machines[selectedMachine]);
	let totalSteps = $derived(trace.trace.length);
	let step = $derived(currentStep < totalSteps ? trace.trace[currentStep] : null);
	let blank = $derived(trace.machine.blankSymbol);
	let desc = $derived(descriptions[selectedMachine]);

	// Sub-step decomposition
	let subSteps = $derived(step ? decomposeStep(step, blank) : []);
	let narration = $derived(step ? narrateStep(step, blank) : 
		(trace.result.status === 'HALT' ? 'Computation complete — machine halted.' : trace.result.status));

	// CF layers
	let cfLayersLeft = $derived(buildCFLayers(step ? step.preLeft : trace.result.finalLeft, blank));
	let cfLayersRight = $derived(buildCFLayers(step ? step.preRight : trace.result.finalRight, blank));

	// Accumulated Φ
	let accumulated = $derived(computeAccumulatedPhi(trace.trace, currentStep, blank));

	// Adelic diagram phase
	let adelicPhase = $derived.by((): 'idle' | 'selector' | 'matrix-right' | 'matrix-left' | 'halted' => {
		if (currentStep >= totalSteps) return 'halted';
		if (!step) return 'idle';
		// Cycle through phases based on animation timing
		// For now, show the primary operation
		if (step.move === 'R') return 'matrix-right';
		return 'matrix-left';
	});

	// Compute prime modulus for the selector display
	let primeModulus = $derived.by(() => {
		const d = trace.machine.alphabetSize;
		const q = trace.machine.states.length;
		const n = d * q;
		// Find smallest prime >= n
		for (let p = n; ; p++) {
			if (isPrime(p)) return p;
		}
	});

	function isPrime(n: number): boolean {
		if (n < 2) return false;
		if (n < 4) return true;
		if (n % 2 === 0 || n % 3 === 0) return false;
		for (let d = 5; d * d <= n; d += 6) {
			if (n % d === 0 || n % (d + 2) === 0) return false;
		}
		return true;
	}

	// Build tape
	function buildTape(left: number[], right: number[], blankSym: number): { cells: number[], headPos: number } {
		const leftReversed = [...left].reverse();
		const padding = 5;
		const blanks = Array(padding).fill(blankSym);
		const cells = [...blanks, ...leftReversed, ...right, ...blanks];
		const headPos = padding + leftReversed.length;
		return { cells, headPos };
	}

	function prev() { if (currentStep > 0) currentStep--; }
	function next() { if (currentStep < totalSteps) currentStep++; }

	function togglePlay() {
		if (playing) { stopPlay(); }
		else {
			playing = true;
			playInterval = setInterval(() => {
				if (currentStep >= totalSteps) stopPlay();
				else currentStep++;
			}, speed);
		}
	}

	function stopPlay() {
		playing = false;
		if (playInterval) { clearInterval(playInterval); playInterval = null; }
	}

	function reset() { stopPlay(); currentStep = 0; }
	function onMachineChange() { stopPlay(); currentStep = 0; }

	// Tape state
	let preLeft = $derived(step ? step.preLeft : trace.result.finalLeft);
	let preRight = $derived(step ? step.preRight : trace.result.finalRight);
	let tapeData = $derived(buildTape(preLeft, preRight, blank));
	let currentState = $derived(step ? step.preState : trace.result.finalState);
	let cfLeft = $derived(step ? step.cf.preLeft : null);
	let cfRight = $derived(step ? step.cf.preRight : null);

	let transitionText = $derived.by(() => {
		if (!step) return trace.result.status === 'HALT' ? '⏹ HALTED' : trace.result.status;
		return `(${step.preState}, ${step.readSymbol}) → write ${step.writeSymbol}, move ${step.move === 'R' ? 'Right' : 'Left'}, → ${step.postState}`;
	});
</script>

<svelte:head>
	<title>Möbius Computer Visualizer</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-6 space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between flex-wrap gap-2">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">
				<span class="text-indigo-400">Möbius</span> Computer
			</h1>
			<p class="text-xs text-gray-500 mt-0.5">Turing machines as products of GL(2,ℤ) matrices on continued fractions</p>
		</div>
		<div class="flex items-center gap-3">
			<select
				class="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
				bind:value={selectedMachine}
				onchange={onMachineChange}
			>
				{#each Object.keys(machines) as name}
					<option value={name}>{name}</option>
				{/each}
			</select>
			<span class="text-sm text-gray-400 font-mono">
				{currentStep}/{totalSteps}
			</span>
		</div>
	</div>

	<!-- Machine Description -->
	{#if desc}
		<div class="bg-gray-900/60 rounded-lg border border-gray-800 p-3">
			<div class="flex items-start gap-3">
				<span class="text-lg">📋</span>
				<div class="text-sm space-y-1">
					<div class="font-semibold text-gray-200">{desc.title}</div>
					<div class="text-gray-400">{desc.summary}</div>
					<div class="text-xs text-gray-500"><span class="text-gray-400 font-medium">Tape:</span> {desc.tapeFormat}</div>
					<div class="text-xs text-gray-500"><span class="text-amber-400/80 font-medium">Watch for:</span> {desc.watchFor}</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Controls -->
	<div class="bg-gray-900/50 rounded-lg border border-gray-800 p-2.5">
		<div class="flex items-center justify-center gap-2 flex-wrap">
			<button onclick={reset}
				class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">⏮</button>
			<button onclick={prev} disabled={currentStep === 0}
				class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-30">◀</button>
			<button onclick={togglePlay}
				class="px-5 py-1.5 rounded text-sm font-medium transition-colors
					{playing ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'}"
			>{playing ? '⏸ Pause' : '▶ Play'}</button>
			<button onclick={next} disabled={currentStep >= totalSteps}
				class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-30">▶</button>
			<div class="flex items-center gap-2 ml-2">
				<span class="text-xs text-gray-500">Speed:</span>
				<input type="range" min="100" max="2000" step="100" bind:value={speed}
					class="w-20 accent-indigo-500" />
			</div>
		</div>
	</div>

	<!-- ADELIC OVERVIEW DIAGRAM -->
	<AdelicDiagram 
		phase={adelicPhase}
		state={currentState}
		readSymbol={step?.readSymbol ?? blank}
		move={step?.move ?? ''}
		prime={primeModulus}
	/>

	<!-- CLASSICAL VIEW -->
	<div class="bg-gray-900 rounded-lg border border-gray-800 p-4">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">① Classical Tape</h2>
			<div class="flex items-center gap-2">
				<span class="text-xs text-gray-500">State:</span>
				<span class="font-mono text-lg font-bold text-amber-400">{currentState}</span>
			</div>
		</div>

		<!-- Tape -->
		<div class="flex justify-center items-center gap-0.5 overflow-x-auto py-2">
			{#each tapeData.cells as cell, i}
				<div
					class="w-9 h-9 flex items-center justify-center font-mono text-base border transition-all duration-300
						{i === tapeData.headPos
							? 'bg-indigo-600 border-indigo-400 text-white font-bold scale-110 rounded'
							: cell === blank
								? 'bg-gray-800/30 border-gray-700/30 text-gray-600 rounded'
								: 'bg-gray-800 border-gray-700 text-gray-200 rounded'}"
				>{cell}</div>
			{/each}
		</div>
		<div class="text-center mt-0.5"><span class="text-indigo-400 text-[10px]">▲ head</span></div>

		<!-- Transition -->
		<div class="text-center mt-2 font-mono text-sm text-gray-300">{transitionText}</div>

		<!-- Transition Table -->
		{#if step}
			<div class="mt-3 overflow-x-auto">
				<table class="mx-auto text-xs font-mono">
					<thead>
						<tr class="text-gray-500">
							<th class="px-2 py-0.5">State</th>
							<th class="px-2 py-0.5">Read</th>
							<th class="px-2 py-0.5">Write</th>
							<th class="px-2 py-0.5">Move</th>
							<th class="px-2 py-0.5">Next</th>
						</tr>
					</thead>
					<tbody>
						{#each trace.machine.transitions as t}
							<tr class="{t.state === step.preState && t.read === step.readSymbol 
								? 'bg-indigo-600/20 text-indigo-300' : 'text-gray-500'}">
								<td class="px-2 py-0.5">{t.state}</td>
								<td class="px-2 py-0.5">{t.read}</td>
								<td class="px-2 py-0.5">{t.write}</td>
								<td class="px-2 py-0.5">{t.move}</td>
								<td class="px-2 py-0.5">{t.nextState}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- NARRATION -->
	<div class="bg-gray-900 rounded-lg border border-gray-800 p-4">
		<h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">② What's Happening</h2>
		<div class="text-sm text-gray-300 whitespace-pre-line leading-relaxed font-mono">
			{narration}
		</div>
	</div>

	<!-- SUB-STEP DECOMPOSITION -->
	{#if subSteps.length > 0}
		<div class="bg-gray-900 rounded-lg border border-gray-800 p-4">
			<h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">③ Matrix Decomposition</h2>
			<div class="space-y-2">
				{#each subSteps as sub, i}
					<div class="flex items-center gap-3 p-2 rounded bg-gray-800/50 transition-all duration-300
						{sub.target === 'right' ? 'border-l-2 border-indigo-500' : 'border-l-2 border-emerald-500'}">
						<span class="text-xs text-gray-500 w-4">{i+1}.</span>
						<div class="flex items-center gap-2">
							<span class="font-mono text-sm font-bold {sub.target === 'right' ? 'text-indigo-400' : 'text-emerald-400'}">
								{sub.matrixName}
							</span>
							<span class="font-mono text-xs text-gray-400">
								[{sub.matrix[0].join(', ')}; {sub.matrix[1].join(', ')}]
							</span>
						</div>
						<span class="text-xs text-gray-400 ml-auto">
							{sub.operation === 'push' ? '⬆' : '⬇'}
							{sub.label}
						</span>
						<span class="text-[10px] px-1.5 py-0.5 rounded {sub.target === 'right' ? 'bg-indigo-900/50 text-indigo-400' : 'bg-emerald-900/50 text-emerald-400'}">
							{sub.target === 'right' ? 'R' : 'L'}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- CF STACKS -->
	<div class="bg-gray-900 rounded-lg border border-gray-800 p-4">
		<h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">④ Continued Fraction Stacks</h2>

		<div class="grid grid-cols-2 gap-4">
			<!-- Left Stack -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<span class="text-xs font-semibold text-emerald-400">Left Stack</span>
					{#if cfLeft}
						<span class="text-xs text-gray-500">= <span class="text-emerald-400 font-mono">{cfLeft}</span></span>
					{/if}
				</div>
				<div class="font-mono text-sm bg-gray-800/50 rounded px-3 py-2">
					{#if preLeft.length === 0}
						<span class="text-gray-600">∅ (empty)</span>
					{:else}
						<span class="text-emerald-300">[{preLeft.join(', ')}]</span>
					{/if}
				</div>
				{#if cfLayersLeft.length > 0}
					<div class="font-mono text-xs text-gray-400 pl-1">
						{#each cfLayersLeft as layer, i}
							<span style="margin-left: {layer.depth * 12}px" class="block">
								{#if i === 0}
									{layer.value} + 1/( …
								{:else if layer.isLast}
									{layer.value} + 1/(1 + 1/(1 + …))
								{:else}
									{layer.value} + 1/(
								{/if}
							</span>
						{/each}
					</div>
				{:else}
					<div class="text-xs text-gray-600 italic">blank → φ (golden ratio)</div>
				{/if}
			</div>

			<!-- Right Stack -->
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<span class="text-xs font-semibold text-indigo-400">Right Stack</span>
					{#if cfRight}
						<span class="text-xs text-gray-500">= <span class="text-indigo-400 font-mono">{cfRight}</span></span>
					{/if}
				</div>
				<div class="font-mono text-sm bg-gray-800/50 rounded px-3 py-2">
					{#if preRight.length === 0}
						<span class="text-gray-600">∅ (empty)</span>
					{:else}
						<span class="text-indigo-300">[{preRight.join(', ')}]</span>
					{/if}
				</div>
				{#if cfLayersRight.length > 0}
					<div class="font-mono text-xs text-gray-400 pl-1">
						{#each cfLayersRight as layer, i}
							<span style="margin-left: {layer.depth * 12}px" class="block">
								{#if i === 0}
									{layer.value} + 1/( …
								{:else if layer.isLast}
									{layer.value} + 1/(1 + 1/(1 + …))
								{:else}
									{layer.value} + 1/(
								{/if}
							</span>
						{/each}
					</div>
				{:else}
					<div class="text-xs text-gray-600 italic">blank → φ (golden ratio)</div>
				{/if}
			</div>
		</div>

		{#if step}
			<div class="mt-3 grid grid-cols-2 gap-4 text-xs">
				<div class="text-gray-500">
					{step.cf.preLeft} → <span class="text-emerald-400">{step.cf.postLeft}</span>
				</div>
				<div class="text-gray-500">
					{step.cf.preRight} → <span class="text-indigo-400">{step.cf.postRight}</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- SHEAR EXPANSION -->
	<div class="bg-gray-900 rounded-lg border border-gray-800 p-4">
		<h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">⑤ Shear Expansion (Φ)</h2>
		<p class="text-xs text-gray-500 mb-3">The entire computation as a product of matrices. Each step adds factors to the chain.</p>

		<div class="grid grid-cols-2 gap-4">
			<!-- Phi_R -->
			<div>
				<div class="text-xs text-indigo-400 font-semibold mb-1">Φ<sub>R</sub> (right stack)</div>
				{#if accumulated.chainR.length > 0}
					<div class="font-mono text-[11px] text-gray-500 mb-2 break-all leading-relaxed">
						{accumulated.chainR.join(' · ')}
					</div>
				{:else}
					<div class="text-xs text-gray-600 italic mb-2">I (identity)</div>
				{/if}
				<div class="inline-flex items-center gap-1 font-mono text-sm">
					<span class="text-gray-600 text-xl" style="font-family: serif">[</span>
					<div class="flex flex-col items-center gap-0">
						<div>
							<span class="w-10 inline-block text-right text-indigo-300">{accumulated.phiR[0][0]}</span>
							<span class="w-10 inline-block text-right text-indigo-300/60">{accumulated.phiR[0][1]}</span>
						</div>
						<div>
							<span class="w-10 inline-block text-right text-indigo-300">{accumulated.phiR[1][0]}</span>
							<span class="w-10 inline-block text-right text-indigo-300/60">{accumulated.phiR[1][1]}</span>
						</div>
					</div>
					<span class="text-gray-600 text-xl" style="font-family: serif">]</span>
				</div>
			</div>

			<!-- Phi_L -->
			<div>
				<div class="text-xs text-emerald-400 font-semibold mb-1">Φ<sub>L</sub> (left stack)</div>
				{#if accumulated.chainL.length > 0}
					<div class="font-mono text-[11px] text-gray-500 mb-2 break-all leading-relaxed">
						{accumulated.chainL.join(' · ')}
					</div>
				{:else}
					<div class="text-xs text-gray-600 italic mb-2">I (identity)</div>
				{/if}
				<div class="inline-flex items-center gap-1 font-mono text-sm">
					<span class="text-gray-600 text-xl" style="font-family: serif">[</span>
					<div class="flex flex-col items-center gap-0">
						<div>
							<span class="w-10 inline-block text-right text-emerald-300">{accumulated.phiL[0][0]}</span>
							<span class="w-10 inline-block text-right text-emerald-300/60">{accumulated.phiL[0][1]}</span>
						</div>
						<div>
							<span class="w-10 inline-block text-right text-emerald-300">{accumulated.phiL[1][0]}</span>
							<span class="w-10 inline-block text-right text-emerald-300/60">{accumulated.phiL[1][1]}</span>
						</div>
					</div>
					<span class="text-gray-600 text-xl" style="font-family: serif">]</span>
				</div>
			</div>
		</div>

		{#if currentStep >= totalSteps && trace.shear.phiR && trace.shear.phiL}
			<div class="mt-3 p-2 bg-amber-900/10 border border-amber-800/30 rounded text-xs text-amber-300">
				✓ Computation complete. The entire {totalSteps}-step computation is encoded in these two matrices.
			</div>
		{/if}
	</div>

	<!-- P-ADIC TREES -->
	<PadicTrees
		alphabetSize={trace.machine.alphabetSize}
		numStates={trace.machine.states.length}
		stateIndex={trace.machine.states.indexOf(currentState)}
		readSymbol={step?.readSymbol ?? blank}
		transitions={trace.machine.transitions}
		states={trace.machine.states}
		depth={3}
	/>

	<!-- Footer -->
	<div class="text-center text-[10px] text-gray-600 pb-4">
		Möbius-Shear framework · {trace.result.steps} steps · {trace.result.status} · 𝔽<sub>{primeModulus}</sub> selector
	</div>
</div>
