// 3D hover tilt for .img-half

(function(){
	const supportsReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (supportsReduced) return;

	const elements = document.querySelectorAll('.img-half');
	const maxTilt = 12; 
	const perspective = 900; 

	function onMove(e){
		const el = e.currentTarget;
		const rect = el.getBoundingClientRect();
		const cx = rect.left + rect.width/2;
		const cy = rect.top + rect.height/2;
		const x = (e.clientX - cx) / (rect.width/2);
		const y = (e.clientY - cy) / (rect.height/2);
		const tx = (-y * maxTilt).toFixed(2);
		const ty = (x * maxTilt).toFixed(2);
		el.style.transform = `perspective(${perspective}px) rotateX(${tx}deg) rotateY(${ty}deg) translateZ(6px)`;
		el.style.transition = 'transform 120ms ease-out';
	}

	function onLeave(e){
		const el = e.currentTarget;
		el.style.transition = 'transform 350ms cubic-bezier(.2,.9,.3,1)';
		el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg)`;
	}

	function onEnter(e){
		const el = e.currentTarget;
		el.style.willChange = 'transform';
	}

	elements.forEach(el => {
		el.style.transformStyle = 'preserve-3d';
		el.addEventListener('mousemove', onMove);
		el.addEventListener('mouseleave', onLeave);
		el.addEventListener('mouseenter', onEnter);
	});
})();

