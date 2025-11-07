/*
 * Controls - ES6 Class for D3-based UI controls
 * @param  parentElement 	-- the HTML element in which to draw the controls
 * @param  data             -- the data for filters
 * @param  minimap          -- reference to minimap for button actions
 */

class Controls {
	constructor(parentElement, data) {
		this.parentElement = parentElement;
		this.data = data;
		this.areachart = null; // Will be set later
	}

	setMinimap(minimap)	{
		this.minimap = minimap;
	}

	initVis() {
		let vis = this;

		// Select the minimap container (timeline)
		const minimapContainer = d3.select("#timeline");
		
		// button group - positioned at bottom of minimap
		const buttonGroup = minimapContainer.append("div")
			.attr("class", "d3-controls")
			.style("position", "absolute")
			.style("bottom", "10px")
			.style("left", "50%")
			.style("transform", "translateX(-50%)")
			.style("display", "flex")
			.style("justify-content", "center")
			.style("gap", "8px")
			.style("z-index", "10");

		// Reset Brush Button
		const buttonPadding = "6px 16px";

		vis.resetBrushBtn = buttonGroup.append("button")
			.attr("class", "btn btn-outline-light btn-sm")
			.style("font-size", "11px")
			.style("padding", buttonPadding)
			.text("View All")
			.on("click", () => {
				vis.minimap.resetBrush();
			});

		// View solar System
		vis.zoomMinBtn = buttonGroup.append("button")
			.attr("class", "btn btn-outline-light btn-sm")
			.style("font-size", "11px")
			.style("padding", buttonPadding)
			.text("View Solar System")
			.on("click", () => {
				vis.minimap.setSolarView();
			});

		// Zoom In Button
		vis.zoomInBtn = buttonGroup.append("button")
			.attr("class", "btn btn-outline-light btn-sm")
			.attr("title", "Zoom In Minimap")
			.style("font-size", "11px")
			.style("padding", buttonPadding)
			.text("Zoom In")
			.on("click", () => {
				vis.minimap.zoomIn();
			});
		


		// Zoom Out Button
		vis.zoomOutBtn = buttonGroup.append("button")
			.attr("class", "btn btn-outline-light btn-sm")
			.attr("title", "Zoom Out Minimap")
			.style("font-size", "11px")
			.style("padding", buttonPadding)
			.text("Zoom Out")
			.on("click", () => {
				vis.minimap.zoomOut(true);
			});

		// Reset Brush Button
		vis.zoomMaxBtn = buttonGroup.append("button")
			.attr("class", "btn btn-outline-light btn-sm")
			.style("font-size", "11px")
			.style("padding", buttonPadding)
			.text("Zoom Out (max)")
			.on("click", () => {
				vis.minimap.zoomOutMax();
			});
	}

	setAreachart(areachart) {
		this.areachart = areachart;
	}
}
