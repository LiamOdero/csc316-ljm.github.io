
/*
Minimap - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- the data the timeline should use
 */

EPSILON = 0.75e-1
class Minimap {

	// constructor method to initialize Timeline object
	constructor(parentElement, data, mainChart){
		this._parentElement = parentElement;
		this._data = data;
		this._mainChart = mainChart;

		// No data wrangling, no update sequence
		this._displayData = data;

		// Track current minimap domain for zoom functionality
		this.currentXDomain = null;
		this.currentYDomain = null;
		this.zoomStack = []; // stack to store zoom history
		this.isPanning = false; // flag to track panning state
		this.isDraggingViewport = false; // flag to track viewport drag state
		this.currentBrushDomain = null; // domain of brush on minimap
		this.currentFilterCriteria = null; // store current filter state

		this.planetData = this._mainChart.data.filter((e) => isNaN(e.name));
	}

	// create initVis method for Timeline class
	initVis() {

		// store keyword this which refers to the object it belongs to in variable vis
		let vis = this;

		vis.margin = {top: 10, right: 40, bottom: 30, left: 40};

		vis.width = document.getElementById(vis._parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		vis.height = document.getElementById(vis._parentElement).getBoundingClientRect().height  - vis.margin.top - vis.margin.bottom;

		// SVG drawing area
		vis.svg = d3.select("#" + vis._parentElement).append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

		const chartData = vis._mainChart.data;

		// Initialize current domain to full extent
		vis.currentXDomain = d3.extent(chartData, d => d.x_pos);
		vis.currentYDomain = d3.extent(chartData, d => d.y_pos);

		// scales on minimap based on the given data
		vis.x = d3.scaleLinear()
			.range([0, vis.width])
			.domain(vis.currentXDomain);

		vis.y = d3.scaleLinear()
			.range([vis.height, 0])
			.domain(vis.currentYDomain);

		vis.r = d3.scaleLinear()
			.range([0, 2]) 
			.domain(d3.extent(chartData, d => d.rad));

		// stars on the minimap
		vis.starsGroup = vis.svg.append("g")
			.attr("class", "minimap-stars");

		vis.updateMinimapStars();

		// Add draggable background for panning (add this first, before viewport)
		// DISABLED: Panning functionality removed per user request
		vis.panArea = vis.svg.append("rect")
			.attr("class", "pan-area")
			.attr("width", vis.width)
			.attr("height", vis.height)
			.attr("fill", "transparent")
			.style("cursor", "default")
			.lower(); // Put it behind everything

		// Add viewport rectangle to show main chart's current view (add after pan-area)
		vis.viewportRect = vis.svg.append("rect")
			.attr("class", "viewport-rect")
			.attr("fill", "none")
			.attr("stroke", "#ffd369")
			.attr("stroke-width", 2)
			.attr("rx", 2)
			.attr("pointer-events", "all")
			.style("cursor", "move");

		// Make viewport rectangle draggable
		const viewportDrag = d3.drag()
			.on("start", function(event) {
				vis.isDraggingViewport = true;
				d3.select(this).style("cursor", "grabbing");
				event.sourceEvent.stopPropagation(); // Prevent pan-area from receiving event
			})
			.on("drag", function(event) {
				// Get current viewport position and size
				const rect = d3.select(this);
				const width = parseFloat(rect.attr("width"));
				const height = parseFloat(rect.attr("height"));
				
				// Calculate new position
				let newX = parseFloat(rect.attr("x")) + event.dx;
				let newY = parseFloat(rect.attr("y")) + event.dy;

				// Clamp to minimap bounds
				newX = Math.max(0, Math.min(newX, vis.width - width));
				newY = Math.max(0, Math.min(newY, vis.height - height));

				// Update rectangle position
				rect.attr("x", newX).attr("y", newY);

				// Convert pixel position to data domain
				const xDomain = [vis.x.invert(newX), vis.x.invert(newX + width)];
				const yDomain = [vis.y.invert(newY + height), vis.y.invert(newY)]; // y is inverted

				// Update main chart
				vis._mainChart.updateDomainWithoutMinimapUpdate(xDomain, yDomain);
			})
			.on("end", function() {
				vis.isDraggingViewport = false;
				d3.select(this).style("cursor", "move");
			});


		vis.viewportRect.call(viewportDrag);
		vis.setSolarView();
	}

	setSolarView()	{
		let padding={top: 1e-11, bottom: 1e-11, left: 1e-11, right: 1e-11};
		let vis = this;

		let planetXExtent = d3.extent(vis.planetData, d => d.x_pos);
		let planetYExtent = d3.extent(vis.planetData, d => d.y_pos);

		vis.currentXDomain = [planetXExtent[0] - padding.left, planetXExtent[1] + padding.right];
		vis.currentYDomain = [planetYExtent[0] - padding.bottom, planetYExtent[1] + padding.top];
		vis._mainChart.updateDomain(vis.currentXDomain, vis.currentYDomain);
		vis.updateBrushFromMainChart(vis.currentXDomain, vis.currentYDomain)
		vis.updateMinimapView(false);
		
	}

	/**
	 * resets the view to the original domain
	 */
	resetBrush() {
		let vis = this;
		
		// Hide viewport rectangle
		vis.viewportRect.attr("opacity", 0);
		
		// Reset main chart with animation
		vis._mainChart.resetDomain();
		
		// Reset minimap zoom to full extent
		const chartData = vis._mainChart.data;
		vis.currentXDomain = d3.extent(chartData, d => d.x_pos);
		vis.currentYDomain = d3.extent(chartData, d => d.y_pos);
		vis.zoomStack = [];
		vis.updateMinimapView();
	}

	/**
	 * set the view to show the full extent of all data
	 */
	setFullExtent() {
		let vis = this;
		const chartData = vis._mainChart.data;
		const maxX = d3.extent(chartData, d => d.x_pos);
		const maxY = d3.extent(chartData, d => d.y_pos);
		
		vis._mainChart.updateDomain(maxX, maxY);
	}

	/**
	 * update star's on the minimap based on current domain (currently for zooming in and out)
	 */
	updateMinimapStars(useTransition = true) {
		let vis = this;
		const chartData = vis._mainChart.data;

		let displayData;
		if (vis.isPanning) {
			displayData = chartData;
		} else {
			displayData = chartData.filter(d => 
				d.x_pos >= vis.currentXDomain[0] && d.x_pos <= vis.currentXDomain[1] &&
				d.y_pos >= vis.currentYDomain[0] && d.y_pos <= vis.currentYDomain[1]
			);
		}

		// radius on minimap scales relative to how zoomed in the minimap is.
		if (displayData.length > 0) {
			const radExtent = d3.extent(displayData, d => d.rad);
			vis.r.domain(radExtent);
		}

		displayData = displayData.filter((e) =>	{
			return vis.r(e.rad) > EPSILON;
		})

		const circles = vis.starsGroup.selectAll("circle")
			.data(displayData, d => d.name); 

		circles.enter()
			.append("circle")
			.attr("cx", d => vis.x(d.x_pos))
			.attr("cy", d => vis.y(d.y_pos))
			.attr("r", d => vis.r(d.rad))
			.attr("fill", d => vis._mainChart.colorScale(d.temp))
			.attr("opacity", 1)
			.merge(circles)
			.each(function(d) {
				const selection = useTransition ? d3.select(this).transition().duration(800) : d3.select(this);
				selection
					.attr("cx", d => vis.x(d.x_pos))
					.attr("cy", d => vis.y(d.y_pos))
					.attr("r", d => vis.r(d.rad))
					.attr("fill", d => vis._mainChart.colorScale(d.temp));
				
				// Apply current filter criteria to ensure consistency
				if (vis.currentFilterCriteria) {
					const distOk = Math.abs(d.dist) >= vis.currentFilterCriteria.distanceMin && Math.abs(d.dist) <= vis.currentFilterCriteria.distanceMax;
					const radOk = d.rad >= vis.currentFilterCriteria.radiusMin && d.rad <= vis.currentFilterCriteria.radiusMax;
					const tempOk = d.temp >= vis.currentFilterCriteria.temperatureMin && d.temp <= vis.currentFilterCriteria.temperatureMax;
					const lumOk = isNaN(d.lum) || (d.lum >= vis.currentFilterCriteria.luminosityMin && d.lum <= vis.currentFilterCriteria.luminosityMax);
					const matches = distOk && radOk && tempOk && lumOk;
					
					if (!matches) {
						// Star doesn't match filter - fade and shrink
						selection
							.attr("opacity", 0)
							.attr("r", 0.1);
					}
				}
			});

		circles.exit().remove();
	}

	/**
	 * update entire minimap
	 */
	updateMinimapView(useTransition = true) {
		let vis = this;
		vis.x.domain(vis.currentXDomain);
		vis.y.domain(vis.currentYDomain);

		vis.updateMinimapStars(useTransition);
		
		// Update viewport rectangle if brush is active
		if (vis.currentBrushDomain) {
			vis.updateViewportRectangle(vis.currentBrushDomain.x, vis.currentBrushDomain.y, useTransition);
		}
	}

	/**
	 * Update viewport rectangle to show the current main chart view
	 */
	updateBrushFromMainChart(xDomain, yDomain) {
		let vis = this;

		// Don't update if we're currently panning or dragging viewport
		if (vis.isPanning || vis.isDraggingViewport) return;

		// Check if we're viewing the full extent (reset state)
		const chartData = vis._mainChart.data;
		const fullXDomain = d3.extent(chartData, d => d.x_pos);
		const fullYDomain = d3.extent(chartData, d => d.y_pos);
		const isFullExtent = Math.abs(xDomain[0] - fullXDomain[0]) < 0.001 && 
		                     Math.abs(xDomain[1] - fullXDomain[1]) < 0.001 &&
		                     Math.abs(yDomain[0] - fullYDomain[0]) < 0.001 && 
		                     Math.abs(yDomain[1] - fullYDomain[1]) < 0.001;

		// Hide viewport rectangle if viewing full extent
		if (isFullExtent) {
			vis.currentBrushDomain = null;
			vis.viewportRect
				.transition()
				.duration(800)
				.attr("opacity", 0);
			return;
		}

		// Store current brush domain for zoom updates
		vis.currentBrushDomain = { x: xDomain, y: yDomain };

		// Zoom minimap to show area around the brush
		const xRange = xDomain[1] - xDomain[0];
		const yRange = yDomain[1] - yDomain[0];
		const xCenter = (xDomain[0] + xDomain[1]) / 2;
		const yCenter = (yDomain[0] + yDomain[1]) / 2;
		
		// Zoom factor: make the minimap show 3x the brush area
		const zoomFactor = 3;
		
		let newXDomain = [
			xCenter - (xRange * zoomFactor) / 2,
			xCenter + (xRange * zoomFactor) / 2
		];
		let newYDomain = [
			yCenter - (yRange * zoomFactor) / 2,
			yCenter + (yRange * zoomFactor) / 2
		];
		
		// Clamp to full data extent
		newXDomain[0] = Math.max(newXDomain[0], fullXDomain[0]);
		newXDomain[1] = Math.min(newXDomain[1], fullXDomain[1]);
		newYDomain[0] = Math.max(newYDomain[0], fullYDomain[0]);
		newYDomain[1] = Math.min(newYDomain[1], fullYDomain[1]);
		
		// Update minimap domain
		vis.currentXDomain = newXDomain;
		vis.currentYDomain = newYDomain;
		vis.x.domain(vis.currentXDomain);
		vis.y.domain(vis.currentYDomain);
		
		// Update minimap view with transition
		vis.updateMinimapView(true);
	}

	/**
	 * Update viewport rectangle position and size
	 */
	updateViewportRectangle(xDomain, yDomain, useTransition = true) {
		let vis = this;

		// Check if domains are within current minimap view
		const inView = xDomain[0] >= vis.currentXDomain[0] && 
		               xDomain[1] <= vis.currentXDomain[1] &&
		               yDomain[0] >= vis.currentYDomain[0] && 
		               yDomain[1] <= vis.currentYDomain[1];

		if (inView) {
			// Convert data domain to pixel coordinates
			const x0 = vis.x(xDomain[0]);
			const x1 = vis.x(xDomain[1]);
			const y0 = vis.y(yDomain[1]); // y scale is inverted
			const y1 = vis.y(yDomain[0]);

			// Update viewport rectangle
			const rect = useTransition ? 
				vis.viewportRect.transition().duration(800) : 
				vis.viewportRect;
			
			rect
				.attr("x", x0)
				.attr("y", y0)
				.attr("width", x1 - x0)
				.attr("height", y1 - y0)
				.attr("opacity", 1);
		} else {
			// Hide viewport rectangle if main chart view is outside minimap
			const rect = useTransition ? 
				vis.viewportRect.transition().duration(800) : 
				vis.viewportRect;
			rect.attr("opacity", 0);
		}
	}

	/**
	 * Apply filters to fade out stars that don't match criteria
	 */
	applyFilters(filterCriteria) {
		let vis = this;
		
		// Store the current filter criteria so we can reapply when panning
		vis.currentFilterCriteria = filterCriteria;
		
		// Check each star against filter criteria and update opacity + radius
		vis.starsGroup.selectAll("circle")
			.each(function(d) {
				const distOk = Math.abs(d.dist) >= filterCriteria.distanceMin && Math.abs(d.dist) <= filterCriteria.distanceMax;
				const radOk = d.rad >= filterCriteria.radiusMin && d.rad <= filterCriteria.radiusMax;
				const tempOk = d.temp >= filterCriteria.temperatureMin && d.temp <= filterCriteria.temperatureMax;
				const lumOk = isNaN(d.lum) || (d.lum >= filterCriteria.luminosityMin && d.lum <= filterCriteria.luminosityMax);
				const matches = distOk && radOk && tempOk && lumOk;
				
				const circle = d3.select(this);
				const originalRadius = vis.r(d.rad);
				
				if (matches) {
					// Star matches - restore full opacity and original size
					circle.transition()
						.duration(500)
						.attr("opacity", 1)
						.attr("r", originalRadius);
				} else {
					// Star doesn't match - fade and shrink to nearly invisible
					circle.transition()
						.duration(500)
						.attr("opacity", 0)
						.attr("r", 0.1);
				}
			});
	}

	/**
	 * Zoom in on the minimap (reduce domain by 50%)
	 */
	zoomIn() {
		let vis = this;

		// Save current domain
		vis.zoomStack.push({
			x: [...vis.currentXDomain],
			y: [...vis.currentYDomain]
		});

		// Calculate center (use brush center if available, otherwise minimap center)
		let xCenter, yCenter;
		if (vis.currentBrushDomain) {
			xCenter = (vis.currentBrushDomain.x[0] + vis.currentBrushDomain.x[1]) / 2;
			yCenter = (vis.currentBrushDomain.y[0] + vis.currentBrushDomain.y[1]) / 2;
		} else {
			xCenter = (vis.currentXDomain[0] + vis.currentXDomain[1]) / 2;
			yCenter = (vis.currentYDomain[0] + vis.currentYDomain[1]) / 2;
		}

		// Calculate new domain (zoom in by 50%)
		const xRange = vis.currentXDomain[1] - vis.currentXDomain[0];
		const yRange = vis.currentYDomain[1] - vis.currentYDomain[0];

		vis.currentXDomain = [
			xCenter - xRange * 0.25,
			xCenter + xRange * 0.25
		];
		vis.currentYDomain = [
			yCenter - yRange * 0.25,
			yCenter + yRange * 0.25
		];

		vis.updateMinimapView(true);
	}

	/**
	 * Zoom out on the minimap (restore previous zoom level or expand by 2x)
	 */
	zoomOut() {
		let vis = this;

		if (vis.zoomStack.length > 0) {
			// Pop from zoom stack
			const previousZoom = vis.zoomStack.pop();
			vis.currentXDomain = previousZoom.x;
			vis.currentYDomain = previousZoom.y;
		} else {
			// If no history, zoom out by 2x
			// Calculate center (use brush center if available, otherwise minimap center)
			let xCenter, yCenter;
			if (vis.currentBrushDomain) {
				xCenter = (vis.currentBrushDomain.x[0] + vis.currentBrushDomain.x[1]) / 2;
				yCenter = (vis.currentBrushDomain.y[0] + vis.currentBrushDomain.y[1]) / 2;
			} else {
				xCenter = (vis.currentXDomain[0] + vis.currentXDomain[1]) / 2;
				yCenter = (vis.currentYDomain[0] + vis.currentYDomain[1]) / 2;
			}

			const xRange = vis.currentXDomain[1] - vis.currentXDomain[0];
			const yRange = vis.currentYDomain[1] - vis.currentYDomain[0];

			vis.currentXDomain = [
				xCenter - xRange,
				xCenter + xRange
			];
			vis.currentYDomain = [
				yCenter - yRange,
				yCenter + yRange
			];

			// Clamp to original data extent
			const chartData = vis._mainChart.data;
			const maxXDomain = d3.extent(chartData, d => d.x_pos);
			const maxYDomain = d3.extent(chartData, d => d.y_pos);

			vis.currentXDomain[0] = Math.max(vis.currentXDomain[0], maxXDomain[0]);
			vis.currentXDomain[1] = Math.min(vis.currentXDomain[1], maxXDomain[1]);
			vis.currentYDomain[0] = Math.max(vis.currentYDomain[0], maxYDomain[0]);
			vis.currentYDomain[1] = Math.min(vis.currentYDomain[1], maxYDomain[1]);
		}

		vis.updateMinimapView(true);
	}
}