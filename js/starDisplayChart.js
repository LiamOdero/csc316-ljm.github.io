
/*
 * StarDisplayChart - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- the data the that's provided initially
 * @param  displayData      -- the data that will be used finally (which might vary based on the selection)
 *
 * @param  focus            -- a switch that indicates the current mode (focus or stacked overview)
 * @param  selectedIndex    -- a global 'variable' inside the class that keeps track of the index of the selected area
 */

class StarDisplayChart {

// constructor method to initialize StarDisplayChart object
constructor(parentElement, data, comparison) {
    this.parentElement = parentElement;
    this.data = data;
    this.displayData =data;
	this.get_pos();
	this.comparison = comparison
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
			.ticks(3)

		vis.yAxis = d3.axisLeft()
			.scale(vis.y)
			.ticks(3);

		let xAxisGroup = vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", "translate(0," + vis.y(0) + ")");

		xAxisGroup.append("text")    
						   .attr("class", "axis-title")
						   .attr("text-anchor", "middle")
						   .attr("fill", "white")
						   .text("Distance from Earth (Light Years)")
						   .attr("transform", "translate(50, -10)")
						   .attr("opacity", 0.5);

		let yAxisGroup = vis.svg.append("g")
			.attr("class", "y-axis axis")
			.attr("transform", "translate("+ vis.x(0)  + ", 0)");

		yAxisGroup.append("text")    
						   .attr("class", "axis-title")
						   .attr("text-anchor", "middle")
						   .attr("fill", "white")
						   .text("Distance from Earth (Light Years)")
						   .attr("transform", "translate(0, -10)")
						   .attr("opacity", 0.5);

        vis.updateVis();
	}

	get_pos()	{
		// For each data point, defines their position on the chart using an offset
		for (let i = 0; i < this.data.length; i++)	{

			// Randomly determining x and y positions while keeping distance from center
			// TODO: seeding, for now any filters should just apply on the base data, never change it though

			let x_proportion = Math.random()
			this.data[i].x_pos = x_proportion * this.data[i].dist * -1;
			let reflect = Math.random();


			this.data[i].y_pos = Math.sqrt(this.data[i].dist ** 2 - this.data[i].x_pos ** 2)
			if (reflect < 0.5)	{
				this.data[i].y_pos *= -1
			}	
		}
	}

	getTooltipContent(d) {
		const formatInteger = d3.format(",.0f");
		const formatSI = d3.format(".2s");

		const name = d.name || "Unknown star";
		const distance = Number.isFinite(d.dist) ? `${Math.abs(d.dist).toFixed(2)} ly` : "Unknown";
		const radius = Number.isFinite(d.rad) ? `${formatSI(d.rad)} km` : "Unknown";
		const temperature = Number.isFinite(d.temp) ? `${formatInteger(d.temp)} K` : "Unknown";
		const luminosity = Number.isFinite(d.lum) ? `${formatSI(d.lum)} W` : "Unknown";

		this.comparison.highlightStar(d)

		return `
			<div><strong>${name}</strong></div>
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

	/**
	 * Update the chart domain based on brush selection
	 */
	updateDomain(xDomain, yDomain) {
		let vis = this;
		
		let currXDomain = vis.x.domain()
		let currYDomain = vis.y.domain()

		// scales are updated to the new domain
		vis.x.domain(xDomain);
		vis.y.domain(yDomain);
		let inRangeData;
		if (currXDomain[0] <= xDomain[0] && xDomain[1] <= currXDomain[1] && currYDomain[0] <= yDomain[0] && yDomain[1] <= currYDomain[1])	{
			inRangeData = vis.displayData.filter((e) =>	{
			return xDomain[0] <= e.x_pos && e.x_pos <= xDomain[1] && yDomain[0] <= e.y_pos && e.y_pos <= yDomain[1]  
			})
		}	else	{
			inRangeData = vis.data.filter((e) =>	{
				return xDomain[0] <= e.x_pos && e.x_pos <= xDomain[1] && yDomain[0] <= e.y_pos && e.y_pos <= yDomain[1]  
			})
		}
		


		vis.r.domain(d3.extent(inRangeData, d => d.rad))
		
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
