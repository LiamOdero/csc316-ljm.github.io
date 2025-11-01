
/*
Minimap - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- the data the timeline should use
 */

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
		vis.panArea = vis.svg.append("rect")
			.attr("class", "pan-area")
			.attr("width", vis.width)
			.attr("height", vis.height)
			.attr("fill", "transparent")
			.style("cursor", "grab")
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

		// Add panning functionality using drag on the pan-area
		vis.isPanning = false;
		let dragStartX, dragStartY, startXDomain, startYDomain;

		const drag = d3.drag()
			.on("start", function(event) {
				vis.isPanning = true;
				dragStartX = event.x;
				dragStartY = event.y;
				startXDomain = [...vis.currentXDomain];
				startYDomain = [...vis.currentYDomain];
				d3.select(this).style("cursor", "grabbing");
			})
			.on("drag", function(event) {
				const dx = event.x - dragStartX;
				const dy = event.y - dragStartY;

				// Convert pixel movement to data domain shift
				const xRange = startXDomain[1] - startXDomain[0];
				const yRange = startYDomain[1] - startYDomain[0];
				const xShift = -(dx / vis.width) * xRange;
				const yShift = (dy / vis.height) * yRange; // inverted because y scale is flipped

				// Calculate new domain
				let newXDomain = [startXDomain[0] + xShift, startXDomain[1] + xShift];
				let newYDomain = [startYDomain[0] + yShift, startYDomain[1] + yShift];

				// Clamp to data bounds
				const chartData = vis._mainChart.data;
				const maxXDomain = d3.extent(chartData, d => d.x_pos);
				const maxYDomain = d3.extent(chartData, d => d.y_pos);

				if (newXDomain[0] < maxXDomain[0]) {
					newXDomain = [maxXDomain[0], maxXDomain[0] + xRange];
				}
				if (newXDomain[1] > maxXDomain[1]) {
					newXDomain = [maxXDomain[1] - xRange, maxXDomain[1]];
				}
				if (newYDomain[0] < maxYDomain[0]) {
					newYDomain = [maxYDomain[0], maxYDomain[0] + yRange];
				}
				if (newYDomain[1] > maxYDomain[1]) {
					newYDomain = [maxYDomain[1] - yRange, maxYDomain[1]];
				}

				vis.currentXDomain = newXDomain;
				vis.currentYDomain = newYDomain;

				// Update minimap view without transitions for smooth panning
				vis.x.domain(vis.currentXDomain);
				vis.y.domain(vis.currentYDomain);
				vis.updateMinimapStars(false); // No transition during drag
			})
			.on("end", function() {
				vis.isPanning = false;
				d3.select(this).style("cursor", "grab");
				// Filter stars after panning ends
				vis.updateMinimapStars(true);
			});

		vis.panArea.call(drag);
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
	 * update the star's on the minimap based on current domain (currently for zooming in and out)
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
			.each(function() {
				const selection = useTransition ? d3.select(this).transition().duration(0) : d3.select(this);
				selection
					.attr("cx", d => vis.x(d.x_pos))
					.attr("cy", d => vis.y(d.y_pos))
					.attr("r", d => vis.r(d.rad))
					.attr("fill", d => vis._mainChart.colorScale(d.temp));
					// Don't set opacity here - let filters control it
			});

		circles.exit().remove();
	}

	/**
	 * update entire minimap
	 */
	updateMinimapView() {
		let vis = this;
		vis.x.domain(vis.currentXDomain);
		vis.y.domain(vis.currentYDomain);

		vis.updateMinimapStars();
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
			vis.viewportRect.attr("opacity", 0);
			return;
		}

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

			// Update viewport rectangle to show current view
			vis.viewportRect
				.attr("x", x0)
				.attr("y", y0)
				.attr("width", x1 - x0)
				.attr("height", y1 - y0)
				.attr("opacity", 1);
		} else {
			// Hide viewport rectangle if main chart view is outside minimap
			vis.viewportRect.attr("opacity", 0);
		}
	}

	/**
	 * Apply filters to fade out stars that don't match criteria
	 */
	applyFilters(filterCriteria) {
		let vis = this;
		
		// Check each star against filter criteria and update opacity + radius
		vis.svg.select('.stars-group').selectAll("circle")
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

		// Calculate new domain (zoom in by 50%)
		const xRange = vis.currentXDomain[1] - vis.currentXDomain[0];
		const yRange = vis.currentYDomain[1] - vis.currentYDomain[0];
		const xCenter = (vis.currentXDomain[0] + vis.currentXDomain[1]) / 2;
		const yCenter = (vis.currentYDomain[0] + vis.currentYDomain[1]) / 2;

		vis.currentXDomain = [
			xCenter - xRange * 0.25,
			xCenter + xRange * 0.25
		];
		vis.currentYDomain = [
			yCenter - yRange * 0.25,
			yCenter + yRange * 0.25
		];

		vis.updateMinimapView();
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
			const xRange = vis.currentXDomain[1] - vis.currentXDomain[0];
			const yRange = vis.currentYDomain[1] - vis.currentYDomain[0];
			const xCenter = (vis.currentXDomain[0] + vis.currentXDomain[1]) / 2;
			const yCenter = (vis.currentYDomain[0] + vis.currentYDomain[1]) / 2;

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

		vis.updateMinimapView();
	}
}