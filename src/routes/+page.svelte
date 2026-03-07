<script lang="ts">
	import type { Trace, Step } from '$lib/types';
	import bb3 from '$lib/traces/bb3_trace.json';
	import unaryAdd from '$lib/traces/unary_add_trace.json';
	import unaryParity from '$lib/traces/unary_parity_trace.json';
	import binaryAdd from '$lib/traces/binary_add_trace.json';

	const machines: Record<string, Trace> = {
		'BB(3) — Busy Beaver 3': bb3 as Trace,
		'Unary Addition': unaryAdd as Trace,
		'Unary Parity': unaryParity as Trace,
		'Binary Addition': binaryAdd as Trace,
	};

	let selectedMachine = $state('BB(3) — Busy Beaver 3');
	let currentStep = $state(0);
	let playing = $state(false);
	let speed = $state(500); // ms per step
	let playInterval: ReturnType<typeof setInterval> | null = null;

	let trace = $derived(machines[selectedMachine]);
	let totalSteps = $derived(trace.trace.length);
	let step = $derived(currentStep < totalSteps ? trace.trace[currentStep] : null);

	// Accumulated Phi matrices
	let phiL = $derived.by(() => {
		let m = [[1,0],[0,1]]; // identity
		for (let i = 0; i <= currentStep && i < totalSteps; i++) {
			const s = trace.trace[i];
			// For right moves: push on left. For left moves: pop from left.
			// We accumulate step matrices on the left side
		}
		// Just show the final shear values at current step progress
		return null; // Will compute properly
	});

	function matMul(a: number[][], b: number[][]): number[][] {
		return [
			[a[0][0]*b[0][0] + a[0][1]*b[1][0], a[0][0]*b[0][1] + a[0][1]*b[1][1]],
			[a[1][0]*b[0][0] + a[1][1]*b[1][0], a[1][0]*b[0][1] + a[1][1]*b[1][1]],
		];
	}

	// Build tape from left/right stacks
	function buildTape(left: number[], right: number[], blank: number): { cells: number[], headPos: number } {
		// Left stack: top is nearest to head, stored left-to-right
		// Right stack: top is at head position
		const leftReversed = [...left].reverse();
		const padding = 6;
		const blanks = Array(padding).fill(blank);
		const cells = [...blanks, ...leftReversed, ...right, ...blanks];
		const headPos = padding + leftReversed.length;
		return { cells, headPos };
	}

	function prev() {
		if (currentStep > 0) currentStep--;
	}

	function next() {
		if (currentStep < totalSteps) currentStep++;
	}

	function togglePlay() {
		if (playing) {
			stopPlay();
		} else {
			playing = true;
			playInterval = setInterval(() => {
				if (currentStep >= totalSteps) {
					stopPlay();
				} else {
					currentStep++;
				}
			}, speed);
		}
	}

	function stopPlay() {
		playing = false;
		if (playInterval) {
			clearInterval(playInterval);
			playInterval = null;
		}
	}

	function reset() {
		stopPlay();
		currentStep = 0;
	}

	function onMachineChange() {
		stopPlay();
		currentStep = 0;
	}

	// Derive tape state for display
	let preLeft = $derived(step ? step.preLeft : trace.result.finalLeft);
	let preRight = $derived(step ? step.preRight : trace.result.finalRight);
	let tapeData = $derived(buildTape(preLeft, preRight, trace.machine.blankSymbol));

	// Current state
	let currentState = $derived(step ? step.preState : trace.result.finalState);

	// CF values
	let cfLeft = $derived(step ? step.cf.preLeft : null);
	let cfRight = $derived(step ? step.cf.preRight : null);

	// Transition info
	let transitionText = $derived.by(() => {
		if (!step) return trace.result.status === 'HALT' ? 'HALTED' : trace.result.status;
		const t = step;
		return `(${t.preState}, ${t.readSymbol}) → write ${t.writeSymbol}, move ${t.move}, → ${t.postState}`;
	});

	// Step matrix display
	let stepMatrix = $derived(step ? step.matrix : null);
	let shearInfo = $derived(step ? `${step.shearFactor.kind === 'push' ? 'P' : 'Q'}_${step.shearFactor.k}` : null);

	// Accumulated product up to current step
	let accPhiR = $derived.by(() => {
		let m = [[1,0],[0,1]];
		for (let i = 0; i < currentStep && i < totalSteps; i++) {
			const s = trace.trace[i];
			if (s.move === 'R') {
				// Q_a on R (pop read), then accumulate
				const qa: number[][] = [[0,1],[1,-s.shearFactor.k]];
				m = matMul(m, qa);
			}
		}
		return m;
	});
</script>

<svelte:head>
	<title>Möbius Computer</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-6 space-y-5">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold tracking-tight">
			<span class="text-indigo-400">Möbius</span> Computer
		</h1>
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
				Step {currentStep}/{totalSteps}
			</span>
		</div>
	</div>

	<!-- Classical Tape View -->
	<div class="bg-gray-900 rounded-lg border border-gray-800 p-4">
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Classical View</h2>
			<div class="flex items-center gap-2">
				<span class="text-xs text-gray-500">State:</span>
				<span class="font-mono text-lg font-bold text-amber-400">{currentState}</span>
			</div>
		</div>

		<!-- Tape -->
		<div class="flex justify-center items-center gap-0.5 overflow-x-auto py-2">
			{#each tapeData.cells as cell, i}
				<div
					class="w-10 h-10 flex items-center justify-center font-mono text-lg border transition-all duration-300
						{i === tapeData.headPos
							? 'bg-indigo-600 border-indigo-400 text-white font-bold scale-110 rounded'
							: cell === trace.machine.blankSymbol
								? 'bg-gray-800/50 border-gray-700/50 text-gray-600 rounded'
								: 'bg-gray-800 border-gray-700 text-gray-200 rounded'}"
				>
					{cell}
				</div>
			{/each}
		</div>

		<!-- Head indicator -->
		<div class="text-center mt-1">
			<span class="text-indigo-400 text-xs">▲ head</span>
		</div>

		<!-- Transition -->
		<div class="text-center mt-2 font-mono text-sm text-gray-300">
			{transitionText}
		</div>
	</div>

	<!-- Möbius View -->
	<div class="bg-gray-900 rounded-lg border border-gray-800 p-4">
		<h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Möbius View</h2>

		<div class="grid grid-cols-2 gap-4">
			<!-- Left Stack -->
			<div class="space-y-2">
				<div class="text-xs text-gray-500">Left Stack</div>
				<div class="font-mono text-sm bg-gray-800/50 rounded px-3 py-2">
					[{preLeft.join(', ') || '∅'}]
				</div>
				{#if cfLeft}
					<div class="text-xs text-gray-500">CF value: <span class="text-emerald-400 font-mono">{cfLeft}</span></div>
				{/if}
			</div>

			<!-- Right Stack -->
			<div class="space-y-2">
				<div class="text-xs text-gray-500">Right Stack</div>
				<div class="font-mono text-sm bg-gray-800/50 rounded px-3 py-2">
					[{preRight.join(', ') || '∅'}]
				</div>
				{#if cfRight}
					<div class="text-xs text-gray-500">CF value: <span class="text-emerald-400 font-mono">{cfRight}</span></div>
				{/if}
			</div>
		</div>

		<!-- Step Matrix -->
		{#if stepMatrix && shearInfo}
			<div class="mt-4 flex items-center gap-6">
				<div>
					<div class="text-xs text-gray-500 mb-1">Step matrix: <span class="text-indigo-400">{shearInfo}</span></div>
					<div class="font-mono text-sm inline-flex items-center gap-1">
						<span class="text-gray-500 text-2xl leading-none" style="font-family: serif">⌈</span>
						<div class="flex flex-col items-end gap-0.5">
							<span>{stepMatrix[0][0]}<span class="text-gray-600 mx-2">{stepMatrix[0][1]}</span></span>
							<span>{stepMatrix[1][0]}<span class="text-gray-600 mx-2">{stepMatrix[1][1]}</span></span>
						</div>
						<span class="text-gray-500 text-2xl leading-none" style="font-family: serif">⌉</span>
					</div>
				</div>

				<!-- Final Shear -->
				{#if currentStep === totalSteps && trace.shear.phiR}
					<div>
						<div class="text-xs text-gray-500 mb-1">Φ<sub>R</sub> (final)</div>
						<div class="font-mono text-sm inline-flex items-center gap-1">
							<span class="text-gray-500 text-2xl leading-none" style="font-family: serif">⌈</span>
							<div class="flex flex-col items-end gap-0.5">
								<span>{trace.shear.phiR[0][0]}<span class="text-gray-600 mx-2">{trace.shear.phiR[0][1]}</span></span>
								<span>{trace.shear.phiR[1][0]}<span class="text-gray-600 mx-2">{trace.shear.phiR[1][1]}</span></span>
							</div>
							<span class="text-gray-500 text-2xl leading-none" style="font-family: serif">⌉</span>
						</div>
					</div>
				{/if}

				{#if currentStep === totalSteps && trace.shear.phiL}
					<div>
						<div class="text-xs text-gray-500 mb-1">Φ<sub>L</sub> (final)</div>
						<div class="font-mono text-sm inline-flex items-center gap-1">
							<span class="text-gray-500 text-2xl leading-none" style="font-family: serif">⌈</span>
							<div class="flex flex-col items-end gap-0.5">
								<span>{trace.shear.phiL[0][0]}<span class="text-gray-600 mx-2">{trace.shear.phiL[0][1]}</span></span>
								<span>{trace.shear.phiL[1][0]}<span class="text-gray-600 mx-2">{trace.shear.phiL[1][1]}</span></span>
							</div>
							<span class="text-gray-500 text-2xl leading-none" style="font-family: serif">⌉</span>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Emet Badge -->
	<div class="bg-gray-900 rounded-lg border border-gray-800 p-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4 text-sm">
				<span class="text-gray-500">Emet:</span>
				<span class={trace.emet.aleph ? 'text-emerald-400' : 'text-red-400'}>
					ℵ {trace.emet.aleph ? '✓' : '✗'}
				</span>
				<span class={trace.emet.mem ? 'text-emerald-400' : 'text-red-400'}>
					Mem {trace.emet.mem ? '✓' : '✗'}
				</span>
				<span class={trace.emet.tav ? 'text-emerald-400' : 'text-red-400'}>
					Tav {trace.emet.tav ? '✓' : '✗'}
				</span>
			</div>
			{#if trace.emet.isEmet}
				<span class="text-xl font-bold text-amber-400" title="Emet — Truth">אמת</span>
			{/if}
		</div>
	</div>

	<!-- Controls -->
	<div class="bg-gray-900 rounded-lg border border-gray-800 p-3">
		<div class="flex items-center justify-center gap-3">
			<button
				onclick={reset}
				class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
			>⏮ Reset</button>
			<button
				onclick={prev}
				disabled={currentStep === 0}
				class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-30"
			>◀ Prev</button>
			<button
				onclick={togglePlay}
				class="px-4 py-1.5 rounded text-sm font-medium transition-colors
					{playing ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'}"
			>{playing ? '⏸ Pause' : '▶ Play'}</button>
			<button
				onclick={next}
				disabled={currentStep >= totalSteps}
				class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-30"
			>Next ▶</button>

			<div class="flex items-center gap-2 ml-4">
				<span class="text-xs text-gray-500">Speed:</span>
				<input
					type="range"
					min="50"
					max="1500"
					step="50"
					bind:value={speed}
					class="w-24 accent-indigo-500"
				/>
				<span class="text-xs text-gray-500 font-mono w-12">{speed}ms</span>
			</div>
		</div>
	</div>

	<!-- Info -->
	<div class="text-center text-xs text-gray-600">
		Mode: {step?.selectorMode ?? 'prime'} field selector · 
		Status: {trace.result.status} · 
		{trace.result.steps} steps
	</div>
</div>
