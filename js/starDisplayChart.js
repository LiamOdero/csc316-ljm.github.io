
/*
 * StarDisplayChart - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- the data the that's provided initially
 * @param  displayData      -- the data that will be used finally (which might vary based on the selection)
 *
 * @param  focus            -- a switch that indicates the current mode (focus or stacked overview)
 * @param  selectedIndex    -- a global 'variable' inside the class that keeps track of the index of the selected area
 */

EPSILON = 0.75e-1
EARTH = {name: "Earth", 
						dist: 0, 
						lum: NaN, 
						rad:  6378,
						temp: 288,
						x_pos: 0,
						y_pos: -50}

class StarDisplayChart {

// constructor method to initialize StarDisplayChart object
constructor(parentElement, data, comparison1, comparison2) {
    this.parentElement = parentElement;
    this.data = data;
    this.displayData = data;
	this.comparison1 = comparison1
	this.comparison2 = comparison2
	this.currComparison = this.comparison2;
	this.colours = ["#ff3300","#fff9fb", "#9dbdff"]
	this.minimap = null; // Reference to minimap for brush updates

	// Scale defined via http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html 
	this.colorScale = d3.scaleDiverging()
        .domain([1000, 6500, 35000])
		.range(this.colours)
		.clamp(true);

}

	/*
	 * Method that initializes the visualization (static content, e.g. SVG area or axes)
 	*/
	initVis(){
		let vis = this;

		vis.margin = {top: 40, right: 40, bottom: 60, left: 40};

		vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

		// Store original domain for reset
		vis.originalXDomain = d3.extent(vis.data, d => d.x_pos);
		vis.originalYDomain = d3.extent(vis.data, d => d.y_pos);

		// SVG drawing area
		vis.svg = d3.select("#" + vis.parentElement).append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

		// Scales and axes

		// Since distance is just relative to earth, we can arbitrarily set some stars to -dist to increase the effective space we have
		// to work with
		vis.x = d3.scaleLinear()
			.range([0, vis.width])
			.domain(d3.extent(vis.data, d => d.x_pos));

		vis.y = d3.scaleLinear()
			.range([vis.height, 0])
			.domain(d3.extent(vis.data, d => d.y_pos));

		vis.r = d3.scaleLinear()
			.range([0, vis.width / 90])
			.domain(d3.extent(vis.data, d => d.rad));

		vis.xAxis = d3.axisBottom()
			.scale(vis.x)
			.ticks(0);

		vis.yAxis = d3.axisLeft()
			.scale(vis.y)
			.ticks(0);

		// todo: possibly remove as well
		vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", "translate(0," + vis.y(0) + ")");

		vis.svg.append("g")
			.attr("class", "y-axis axis")
			.attr("transform", "translate("+ vis.x(0)  + ", 0)");

		// Add brush to main chart
		vis.brush = d3.brush()
			.extent([[0, 0], [vis.width, vis.height]])
			.on("end", function(event) {
				if (event.selection) {
					const [[x0, y0], [x1, y1]] = event.selection;
					
					// Convert brush pixel coordinates to data domain
					const xDomain = [vis.x.invert(x0), vis.x.invert(x1)];
					const yDomain = [vis.y.invert(y1), vis.y.invert(y0)];
					
					// Update the chart domain
					vis.updateDomain(xDomain, yDomain);
					
					// Clear the brush selection after applying
					vis.brushGroup.call(vis.brush.move, null);
				}
			});

		vis.brushGroup = vis.svg.append("g")
			.attr("class", "brush")
			.call(vis.brush);

		vis.displayData = vis.data.filter((e) =>	{
			return vis.r(e.rad) > EPSILON;
		})

		vis.button1 = d3.select('#' + vis.comparison1.parentElement).append("button")
		vis.button1.text("Clear")
			  .on("click",	function(d)	{
				vis.buttonEvent(d, vis.button1, vis.comparison1)
			  })
			  .property("disabled", true);

		vis.button2 = d3.select('#' + vis.comparison2.parentElement).append("button")
		vis.button2.text("Set to Earth")
			  .on("click",	function(d)	{
				vis.buttonEvent(d, vis.button2, vis.comparison2)
			  })
													   
		
        vis.updateVis();
	}

	getTooltipContent(d) {
		const formatSI = d3.format(".2e");

		const name = d.name || "Unknown star";
		const distance = Number.isFinite(d.dist) ? `${formatSI(Math.abs(d.dist).toFixed(2))} ly` : "Unknown";
		const radius = Number.isFinite(d.rad) ? `${formatSI(d.rad)} km` : "Unknown";
		const temperature = Number.isFinite(d.temp) ? `${formatSI(d.temp)} K` : "Unknown";
		const luminosity = Number.isFinite(d.lum) ? `${formatSI(d.lum)} W` : "Unknown";

		return `
			<div><strong>ID: ${name}</strong></div>
			<div>Distance: ${distance}</div>
			<div>Radius: ${radius}</div>
			<div>Temperature: ${temperature}</div>
			<div>Luminosity: ${luminosity}</div>
		`.trim();
	}

	/**
	 * Filters the displayed data
	 */
	filterDisplay()	{
		this.updateVis()
	}

	buttonEvent(d, button, comparison)	{
		let vis = this;

		if (d.target.innerHTML === "Clear")	{
			vis.currComparison = comparison
			vis.clearStar(comparison)
			button.text("Set to Earth")

			if (button === vis.button1)	{
				vis.button2.property("disabled", true)
			}	else	{
				vis.button1.property("disabled", true)
			}
		}	else	{
			vis.highlightStar(comparison, EARTH)
			button.text("Clear")
				
			if (button === vis.button1)	{
				vis.button2.property("disabled", false)
			}	else	{
				vis.button1.property("disabled", false)
			}
		}
	}

	/**
	 * A wrapper for clear star that removes comparison from the other star
	 */
	clearStar(comparison)	{
		let vis = this;
		if (comparison == vis.comparison1)	{
			vis.comparison2.clearComparison();
		}	else	{
			vis.comparison1.clearComparison();
		}
		comparison.clearVis();
		vis.currComparison = comparison;
	}

	/**
	 * A wrapper for highlight star that adds a comparison to the other chart
	 */
	highlightStar(comparison, star)	{
		let vis = this;

		if (comparison == vis.comparison1)	{
			vis.comparison2.compareStar(star);
		}	else	{
			vis.comparison1.compareStar(star)
		}
		comparison.highlightStar(star);
		vis.currComparison = null;
	}

	/**
	 * Update the chart domain based on brush selection
	 */
	updateDomain(xDomain, yDomain) {
		let vis = this;

		// scales are updated to the new domain
		vis.x.domain(xDomain);
		vis.y.domain(yDomain);
		let inRangeData;

		inRangeData = vis.data.filter((e) =>	{
			return xDomain[0] <= e.x_pos && e.x_pos <= xDomain[1] && yDomain[0] <= e.y_pos && e.y_pos <= yDomain[1]  
		})
		
		vis.r.domain([inRangeData[0].rad, inRangeData[inRangeData.length - 1].rad])

		inRangeData = inRangeData.filter((e) =>	{
			return vis.r(e.rad) > EPSILON;
		})

		vis.displayData = inRangeData
		
		// Update minimap brush to show current view
		if (vis.minimap) {
			vis.minimap.updateBrushFromMainChart(xDomain, yDomain);
		}
		
		// axis update
		vis.updateVis();
	}

	/**
	 * Update the chart domain without updating the minimap (used when dragging viewport rect)
	 */
	updateDomainWithoutMinimapUpdate(xDomain, yDomain) {
		let vis = this;

		// scales are updated to the new domain
		vis.x.domain(xDomain);
		vis.y.domain(yDomain);
		let inRangeData;

		inRangeData = vis.data.filter((e) =>	{
			return xDomain[0] <= e.x_pos && e.x_pos <= xDomain[1] && yDomain[0] <= e.y_pos && e.y_pos <= yDomain[1]  
		})
		
		vis.r.domain([inRangeData[0].rad, inRangeData[inRangeData.length - 1].rad])

		inRangeData = inRangeData.filter((e) =>	{
			return vis.r(e.rad) > EPSILON;
		})

		vis.displayData = inRangeData
		
		// axis update (without minimap update, and no transition for smooth dragging)
		vis.updateVis(false);
	}

	/**
	 * Reset to original view
	 */
	resetDomain() {
		let vis = this;
		vis.updateDomain(vis.originalXDomain, vis.originalYDomain);
	}

	/**
	 * Set the minimap reference for brush updates
	 */
	setMinimap(minimap) {
		this.minimap = minimap;
	}

	/**
	 * Apply filters to fade out stars that don't match criteria
	 */
	applyFilters(filterCriteria) {
		let vis = this;
		
		vis.svg.selectAll("circle")
			.each(function(d) {
				const distOk = Math.abs(d.dist) >= filterCriteria.distanceMin && Math.abs(d.dist) <= filterCriteria.distanceMax;
				const radOk = d.rad >= filterCriteria.radiusMin && d.rad <= filterCriteria.radiusMax;
				const tempOk = d.temp >= filterCriteria.temperatureMin && d.temp <= filterCriteria.temperatureMax;
				const lumOk = isNaN(d.lum) || (d.lum >= filterCriteria.luminosityMin && d.lum <= filterCriteria.luminosityMax);
				const matches = distOk && radOk && tempOk && lumOk;
				
				const circle = d3.select(this);
				const originalRadius = vis.r(d.rad);
				
				if (matches) {
					// star matches
					circle.transition()
						.duration(500)
						.attr("opacity", 1)
						.attr("r", originalRadius);
				} else {
					// star doesn't match filter, make it shrink as it fades away
					circle.transition()
						.duration(500)
						.attr("opacity", 0)
						.attr("r", 0.1);
				}
			});
	}

	updateVis(useTransition = true){
		let vis = this;

		let circles = vis.svg.selectAll("circle")
			.data(vis.displayData, d => d.name);      

		// Set initial position for entering circles so they don't start from (0,0)
		let enter = circles.enter().append("circle")
			.attr("cx", function(d) { return vis.x(d.x_pos); })
			.attr("cy", function(d) { return vis.y(d.y_pos); })
			.attr("r", function(d) { return vis.r(d.rad); })
			.attr("fill", function(d) { return vis.colorScale(d.temp); })
			.attr("opacity", 0); // Start invisible for smooth fade-in

		// Merge and update both entering and existing circles
		let merged = enter.merge(circles)
			.on("mouseenter", (event, d) => {
				showTooltip(vis.getTooltipContent(d), event);
				d3.select(event.currentTarget)
					.attr("stroke", "#ffffff")
					.attr("stroke-width", 1.5);
			})
			.on("mousemove", (event) => {
				moveTooltip(event);
			})
			.on("mouseleave", (event) => {
				hideTooltip();
				d3.select(event.currentTarget)
					.attr("stroke", null)
					.attr("stroke-width", null);
			})
			.on("click", (event, d) =>	{

				if (vis.currComparison === vis.comparison1)	{
					vis.button2.property("disabled", false);
					vis.button1.text("Clear")
					vis.highlightStar(vis.currComparison, d)
				}	else if (vis.currComparison === vis.comparison2)	{
					vis.button1.property("disabled", false);
					vis.button2.text("Clear")
					vis.highlightStar(vis.currComparison, d)
				}
			});

		// Apply transition only if requested (not during viewport dragging)
		if (useTransition) {
			merged = merged.transition().duration(750);
		}

		merged
			.attr("cx", function(d) {
				return vis.x(d.x_pos); 
			})
			.attr("cy", function(d) {
				return vis.y(d.y_pos); 
			})
			.attr("r", function(d) {
				return vis.r(d.rad)
			})
			.attr("fill", function(d) {
				return vis.colorScale(d.temp)	
			})
			.attr("opacity", 1); // Default to visible
			
		circles.exit().remove()

		vis.svg.select(".x-axis").call(vis.xAxis);
		vis.svg.select(".y-axis").call(vis.yAxis);
	}
}
