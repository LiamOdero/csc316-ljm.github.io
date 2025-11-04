/*
 * Controls - ES6 Class for D3-based UI controls
 * @param  parentElement 	-- the HTML element in which to draw the controls
 * @param  data             -- the data for filters
 * @param  minimap          -- reference to minimap for button actions
 */

class Controls {
	constructor(parentElement, data, minimap) {
		this.parentElement = parentElement;
		this.data = data;
		this.minimap = minimap;
		this.areachart = null; // Will be set later
	}

	initVis() {
		let vis = this;

		// Create SVG for button controls
		const controlsContainer = d3.select("#" + vis.parentElement);
		
		// Create button group using D3
		const buttonGroup = controlsContainer.append("div")
			.attr("class", "d3-controls")
			.style("display", "flex")
			.style("justify-content", "center")
			.style("gap", "10px")
			.style("margin", "10px 0 20px 0");

		// Reset Brush Button
		vis.resetBrushBtn = buttonGroup.append("button")
			.attr("class", "btn btn-outline-light btn-sm")
			.text("Reset Brush")
			.on("click", () => {
				vis.minimap.resetBrush();
			});

		// Zoom In Button
		vis.zoomInBtn = buttonGroup.append("button")
			.attr("class", "btn btn-outline-light btn-sm")
			.attr("title", "Zoom In Minimap")
			.text("Zoom In")
			.on("click", () => {
				vis.minimap.zoomIn();
			});

		// Zoom Out Button
		vis.zoomOutBtn = buttonGroup.append("button")
			.attr("class", "btn btn-outline-light btn-sm")
			.attr("title", "Zoom Out Minimap")
			.text("Zoom Out")
			.on("click", () => {
				vis.minimap.zoomOut();
			});
	}

	setAreachart(areachart) {
		this.areachart = areachart;
	}
}
