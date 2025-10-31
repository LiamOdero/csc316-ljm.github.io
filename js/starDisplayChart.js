
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
		// axis update
		vis.updateVis();
	}

	/**
	 * Reset to original view
	 */
	resetDomain() {
		let vis = this;
		vis.updateDomain(vis.originalXDomain, vis.originalYDomain);
	}

	/*
	 * The drawing function - should use the D3 update sequence (enter, update, exit)
 	* Function parameters only needed if different kinds of updates are needed
 	*/
	updateVis(){
		let vis = this;

		let circles = vis.svg.selectAll("circle")
			.data(vis.displayData);      

		circles.enter().append("circle")
		.merge(circles)
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
			})
			.transition() // added transition so the circles move whenever the brush changes
			.duration(750)
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
			});
		circles.exit().remove()

		vis.svg.select(".x-axis").call(vis.xAxis);
		vis.svg.select(".y-axis").call(vis.yAxis);
	}
}
