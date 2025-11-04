/*
 * Filters - ES6 Class for D3-based filter controls
 * @param  parentElement 	-- the HTML element in which to draw the filters
 * @param  data             -- the data for determining filter ranges
 * @param  areachart        -- reference to main chart
 * @param  minimap          -- reference to minimap
 */

class Filters {
	constructor(parentElement, data, areachart, minimap) {
		this.parentElement = parentElement;
		this.data = data;
		this.areachart = areachart;
		this.minimap = minimap;

		// Calculate extents
		this.distExtent = d3.extent(data, d => Math.abs(d.dist));
		this.radExtent = d3.extent(data, d => d.rad);
		this.tempExtent = d3.extent(data, d => d.temp);
		this.lumExtent = d3.extent(data.filter(d => !isNaN(d.lum)), d => d.lum);

		// Initialize filter values
		this.filters = {
			distanceMin: this.distExtent[0],
			distanceMax: this.distExtent[1],
			radiusMin: this.radExtent[0],
			radiusMax: this.radExtent[1],
			temperatureMin: this.tempExtent[0],
			temperatureMax: this.tempExtent[1],
			luminosityMin: this.lumExtent[0],
			luminosityMax: this.lumExtent[1]
		};
	}

	initVis() {
		let vis = this;

		const container = d3.select("#" + vis.parentElement);
		const formatSI = d3.format(".2e");

		// Clear existing content
		container.html("");

		// Add title
		container.append("h6")
			.style("margin-bottom", "8px")
			.style("font-size", "14px")
			.style("font-weight", "600")
			.text("Filter Stars");

		// Create filter groups
		vis.createFilterGroup(container, "distance", "Distance (light years)", 
			vis.distExtent, formatSI);
		vis.createFilterGroup(container, "radius", "Radius (kilometers)", 
			vis.radExtent, formatSI);
		vis.createFilterGroup(container, "temp", "Temperature (kelvin)", 
			vis.tempExtent, formatSI);
		vis.createFilterGroup(container, "lum", "Luminosity (watts)", 
			vis.lumExtent, formatSI);

		// Reset button
		container.append("button")
			.attr("class", "btn btn-outline-light btn-sm")
			.style("width", "100%")
			.style("margin-top", "5px")
			.style("font-size", "11px")
			.text("Reset Filters")
			.on("click", () => vis.resetFilters());
	}

	createFilterGroup(container, filterName, label, extent, formatter) {
		let vis = this;

		const filterDiv = container.append("div")
			.style("margin-bottom", "8px");

		// Label with value display
		const labelDiv = filterDiv.append("label")
			.style("font-size", "11px")
			.style("display", "flex")
			.style("justify-content", "space-between");

		labelDiv.append("span").text(label);
		const valueSpan = labelDiv.append("span")
			.attr("id", `${filterName}-value`)
			.text(`${formatter(extent[0])} - ${formatter(extent[1])}`);

		// Slider container
		const sliderContainer = filterDiv.append("div")
			.attr("class", "range-slider-container");

		// Min slider
		const minSlider = sliderContainer.append("input")
			.attr("type", "range")
			.attr("class", "range-min")
			.attr("min", 0)
			.attr("max", 100)
			.attr("value", 0)
			.on("input", function() {
				const minPercent = +this.value;
				const maxPercent = +maxSlider.property("value");

				if (minPercent > maxPercent) {
					this.value = maxPercent;
					return;
				}

				vis.updateFilterValue(filterName, "min", minPercent, extent, valueSpan, formatter);
			});

		// Max slider
		const maxSlider = sliderContainer.append("input")
			.attr("type", "range")
			.attr("class", "range-max")
			.attr("min", 0)
			.attr("max", 100)
			.attr("value", 100)
			.on("input", function() {
				const maxPercent = +this.value;
				const minPercent = +minSlider.property("value");

				if (maxPercent < minPercent) {
					this.value = minPercent;
					return;
				}

				vis.updateFilterValue(filterName, "max", maxPercent, extent, valueSpan, formatter);
			});

		// Store references
		vis[`${filterName}MinSlider`] = minSlider;
		vis[`${filterName}MaxSlider`] = maxSlider;
		vis[`${filterName}ValueSpan`] = valueSpan;
	}

	updateFilterValue(filterName, type, percent, extent, valueSpan, formatter) {
		let vis = this;

		const value = extent[0] + (extent[1] - extent[0]) * (percent / 100);
		
		// Update filter object
		if (type === "min") {
			vis.filters[`${filterName}Min`] = value;
		} else {
			vis.filters[`${filterName}Max`] = value;
		}

		// Update display
		valueSpan.text(`${formatter(vis.filters[`${filterName}Min`])} - ${formatter(vis.filters[`${filterName}Max`])}`);

		// Apply filters
		vis.applyFilters();
	}

	applyFilters() {
		let vis = this;

		const filterCriteria = {
			distanceMin: vis.filters.distanceMin,
			distanceMax: vis.filters.distanceMax,
			radiusMin: vis.filters.radiusMin,
			radiusMax: vis.filters.radiusMax,
			temperatureMin: vis.filters.temperatureMin,
			temperatureMax: vis.filters.temperatureMax,
			luminosityMin: vis.filters.luminosityMin,
			luminosityMax: vis.filters.luminosityMax
		};

		vis.areachart.applyFilters(filterCriteria);
		vis.minimap.applyFilters(filterCriteria);
	}

	resetFilters() {
		let vis = this;
		const formatSI = d3.format(".2e");

		// Reset filter values
		vis.filters.distanceMin = vis.distExtent[0];
		vis.filters.distanceMax = vis.distExtent[1];
		vis.filters.radiusMin = vis.radExtent[0];
		vis.filters.radiusMax = vis.radExtent[1];
		vis.filters.temperatureMin = vis.tempExtent[0];
		vis.filters.temperatureMax = vis.tempExtent[1];
		vis.filters.luminosityMin = vis.lumExtent[0];
		vis.filters.luminosityMax = vis.lumExtent[1];

		// Reset sliders
		vis.distanceMinSlider.property("value", 0);
		vis.distanceMaxSlider.property("value", 100);
		vis.radiusMinSlider.property("value", 0);
		vis.radiusMaxSlider.property("value", 100);
		vis.tempMinSlider.property("value", 0);
		vis.tempMaxSlider.property("value", 100);
		vis.lumMinSlider.property("value", 0);
		vis.lumMaxSlider.property("value", 100);

		// Reset displays
		vis.distanceValueSpan.text(`${formatSI(vis.distExtent[0])} - ${formatSI(vis.distExtent[1])}`);
		vis.radiusValueSpan.text(`${formatSI(vis.radExtent[0])} - ${formatSI(vis.radExtent[1])}`);
		vis.tempValueSpan.text(`${formatSI(vis.tempExtent[0])} - ${formatSI(vis.tempExtent[1])}`);
		vis.lumValueSpan.text(`${formatSI(vis.lumExtent[0])} - ${formatSI(vis.lumExtent[1])}`);

		// Apply filters
		vis.applyFilters();
	}
}
