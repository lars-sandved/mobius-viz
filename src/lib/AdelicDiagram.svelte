<script lang="ts">
	interface Props {
		phase: 'idle' | 'selector' | 'matrix-right' | 'matrix-left' | 'halted';
		state: string;
		readSymbol: number;
		move: string;
		prime: number;
	}

	let { phase, state, readSymbol, move, prime }: Props = $props();
</script>

<div class="relative rounded-lg border border-gray-700 bg-gray-900/80 p-3 overflow-hidden">
	<!-- Title -->
	<div class="text-center mb-2">
		<span class="text-[10px] text-gray-500 uppercase tracking-widest">Adelic Structure</span>
	</div>

	<div class="flex items-stretch gap-3 justify-center">
		<!-- REAL PLACE -->
		<div class="flex-1 max-w-[200px] rounded border p-2.5 transition-all duration-500
			{phase === 'matrix-right' || phase === 'matrix-left' 
				? 'border-amber-500/60 bg-amber-950/20 shadow-[0_0_12px_rgba(217,119,6,0.15)]' 
				: 'border-gray-700 bg-gray-800/30'}">
			<div class="text-[10px] text-gray-400 uppercase tracking-wider mb-2 text-center">ℝ — Real Place</div>
			
			<div class="space-y-1.5">
				<!-- Left CF -->
				<div class="flex items-center gap-1.5 rounded px-1.5 py-1 transition-all duration-300
					{phase === 'matrix-left' ? 'bg-emerald-900/30 ring-1 ring-emerald-500/40' : 'bg-gray-800/50'}">
					<span class="text-emerald-400 text-[10px] font-mono font-bold w-3">L</span>
					<span class="text-[10px] text-gray-400">CF Stack</span>
					{#if phase === 'matrix-left'}
						<span class="ml-auto text-[9px] text-emerald-400 animate-pulse">◆</span>
					{/if}
				</div>
				
				<!-- Right CF -->
				<div class="flex items-center gap-1.5 rounded px-1.5 py-1 transition-all duration-300
					{phase === 'matrix-right' ? 'bg-indigo-900/30 ring-1 ring-indigo-500/40' : 'bg-gray-800/50'}">
					<span class="text-indigo-400 text-[10px] font-mono font-bold w-3">R</span>
					<span class="text-[10px] text-gray-400">CF Stack</span>
					{#if phase === 'matrix-right'}
						<span class="ml-auto text-[9px] text-indigo-400 animate-pulse">◆</span>
					{/if}
				</div>

				<!-- GL(2,Z) -->
				<div class="text-center mt-1.5 py-1 rounded transition-all duration-300
					{phase === 'matrix-right' || phase === 'matrix-left' 
						? 'bg-amber-900/20 text-amber-400' : 'bg-gray-800/30 text-gray-500'}">
					<span class="text-[10px] font-mono font-bold">GL(2,ℤ)</span>
					<div class="text-[9px] text-gray-500">Push/Pop matrices</div>
				</div>
			</div>
		</div>

		<!-- ARROW BETWEEN -->
		<div class="flex flex-col items-center justify-center gap-1 px-1">
			<div class="text-gray-600 text-xs">⟷</div>
			<div class="text-[9px] text-gray-600 writing-mode-vertical" style="writing-mode: vertical-lr; text-orientation: mixed;">
				adele
			</div>
		</div>

		<!-- P-ADIC PLACE -->
		<div class="flex-1 max-w-[200px] rounded border p-2.5 transition-all duration-500
			{phase === 'selector' 
				? 'border-violet-500/60 bg-violet-950/20 shadow-[0_0_12px_rgba(139,92,246,0.15)]' 
				: 'border-gray-700 bg-gray-800/30'}">
			<div class="text-[10px] text-gray-400 uppercase tracking-wider mb-2 text-center">𝔽<sub>{prime}</sub> — Prime Place</div>
			
			<div class="space-y-1.5">
				<!-- State -->
				<div class="flex items-center gap-1.5 rounded px-1.5 py-1 transition-all duration-300
					{phase === 'selector' ? 'bg-violet-900/30 ring-1 ring-violet-500/40' : 'bg-gray-800/50'}">
					<span class="text-amber-400 text-[10px] font-mono font-bold">{state}</span>
					<span class="text-[10px] text-gray-400">State</span>
					{#if phase === 'selector'}
						<span class="ml-auto text-[9px] text-violet-400 animate-pulse">◆</span>
					{/if}
				</div>

				<!-- Read symbol -->
				<div class="flex items-center gap-1.5 rounded px-1.5 py-1 transition-all duration-300
					{phase === 'selector' ? 'bg-violet-900/30 ring-1 ring-violet-500/40' : 'bg-gray-800/50'}">
					<span class="text-indigo-400 text-[10px] font-mono font-bold">{readSymbol}</span>
					<span class="text-[10px] text-gray-400">Read</span>
				</div>

				<!-- Selector -->
				<div class="text-center mt-1.5 py-1 rounded transition-all duration-300
					{phase === 'selector' 
						? 'bg-violet-900/20 text-violet-400' : 'bg-gray-800/30 text-gray-500'}">
					<span class="text-[10px] font-mono font-bold">ℤ/Pℤ</span>
					<div class="text-[9px] text-gray-500">Lagrange selector</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Step flow indicator -->
	<div class="mt-2 text-center">
		{#if phase === 'idle'}
			<span class="text-[10px] text-gray-600">Ready</span>
		{:else if phase === 'selector'}
			<span class="text-[10px] text-violet-400">① Selector: (state, symbol) → transition via polynomial over 𝔽<sub>{prime}</sub></span>
		{:else if phase === 'matrix-right'}
			<span class="text-[10px] text-indigo-400">② Applying Möbius matrix to right CF stack</span>
		{:else if phase === 'matrix-left'}
			<span class="text-[10px] text-emerald-400">③ Applying Möbius matrix to left CF stack</span>
		{:else if phase === 'halted'}
			<span class="text-[10px] text-amber-400">✓ Computation complete — Shear expansion encodes the full run</span>
		{/if}
	</div>
</div>
