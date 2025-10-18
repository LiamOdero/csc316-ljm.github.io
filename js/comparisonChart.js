
/*
 * ComparisonChart - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- the data the that's provided initially
 * @param  displayData      -- the data that will be used finally (which might vary based on the selection)
 */

class ComparisonChart {

// constructor method to initialize StarDisplayChart object
constructor(parentElement, textElement) {
    this.parentElement = parentElement;
	this.textElement = textElement
    this.data = [{name: "Earth", 
						dist: 0, 
						lum: NaN, 
						rad:  6378,
						temp: 288,
						x_pos: 0,
						y_pos: -50}];

    this.displayData = []
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

		// SVG drawing area
		vis.svg = d3.select("#" + vis.parentElement).append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

		vis.text = d3.select('#' + vis.textElement)
		vis.text.text("Highlight a star:")

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
			.range([0, vis.width / 2])
			.domain(d3.extent(vis.data, d => d.rad));

		vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", "translate(0," + vis.y(0) + ")");

		this.updateVis();
	}
	highlightStar(star)	{
		this.displayData = [star];
		this.text.text("Click on star below to compare to Earth")
		this.r.domain([0, star.rad])

		this.updateVis();
	}

	highlightEarth()	{
		this.displayData = this.data
		this.updateVis();
	}

	getTooltipContent(d) {
		const formatInteger = d3.format(",.0f");
		const formatSI = d3.format(".2s");

		const name = d.name || "Unknown star";
		const distance = Number.isFinite(d.dist) ? `${Math.abs(d.dist).toFixed(2)} ly` : "Unknown";
		const radius = Number.isFinite(d.rad) ? `${formatSI(d.rad)} km` : "Unknown";
		const temperature = Number.isFinite(d.temp) ? `${formatInteger(d.temp)} K` : "Unknown";
		const luminosity = Number.isFinite(d.lum) ? `${formatSI(d.lum)} W` : "Unknown";

		return `
			<div><strong>${name}</strong></div>
			<div>Distance: ${distance}</div>
			<div>Radius: ${radius}</div>
			<div>Temperature: ${temperature}</div>
			<div>Luminosity: ${luminosity}</div>
		`.trim();
	}
	/**
	 * Reset to original view
	 */
	resetDomain() {
		let vis = this;
		vis.displayData = vis.data;

		vis.x.domain(d3.extent(vis.data, d => d.x_pos));
		vis.y.domain(d3.extent(vis.data, d => d.y_pos));
		vis.r.domain(d3.extent(vis.data, d => d.r));
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
			.attr("fill", function(d) {
				if (d.name === "Earth")	{
					return "#0000A0"
				}	else	{
					return vis.colorScale(d.temp)	
				}
			})
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
			.on("click", (e)	=>	{
				vis.highlightEarth();
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
			});
		circles.exit().remove()
	}
}
