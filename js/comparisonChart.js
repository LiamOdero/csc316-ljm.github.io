
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
	this.displayText = []
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

		vis.margin = {top: 50, right: 40, bottom: 20, left: 40};

		vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

		const totalWidth = vis.width + vis.margin.left + vis.margin.right;
		const totalHeight = vis.height;
		const toolHeight = totalHeight / 4;

		vis.toolarea = d3.select("#" + vis.parentElement)
			.append("svg")
			.attr("width", totalWidth)
			.attr("height", toolHeight + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + 5 + "," + vis.margin.top + ")");

		const drawHeight = (totalHeight * 2) / 4;

		vis.svg = d3.select("#" + vis.parentElement)
			.append("svg")
			.attr("width", totalWidth)
			.attr("height", drawHeight + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + 0 + ")");


		vis.text = d3.select('#' + vis.textElement)
		vis.text.text("Cick any star:")

		// Scales and axes

		vis.x = d3.scaleLinear()
			.range([0, vis.width])
			.domain(d3.extent(vis.data, d => d.x_pos));

		vis.y = d3.scaleLinear()
			.range([drawHeight, 0])
			.domain(d3.extent(vis.data, d => d.y_pos));

		vis.r = d3.scaleLinear()
			.range([0, drawHeight / 4])
			.domain(d3.extent(vis.data, d => d.rad));

		vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", "translate(0," + vis.y(0) + ")");

		this.updateVis();
	}
	highlightStar(star)	{
		
		this.displayData = [star];
		this.r.domain([0, star.rad])

		const formatInteger = d3.format(",.0f");
		const formatSI = d3.format(".2s");

		let name = "ID: " + ((star.name) ? star.name : "Unknown star");
		let distance = "Distance: " + (Number.isFinite(star.dist) ? `${Math.abs(star.dist).toFixed(2)} ly` : "Unknown");
		let radius = "Radius: " + (Number.isFinite(star.rad) ? `${formatSI(star.rad)} km` : "Unknown");
		let temperature = "Temperature: " + (Number.isFinite(star.temp) ? `${formatInteger(star.temp)} K` : "Unknown");
		let luminosity = "Luminosity: " + (Number.isFinite(star.lum) ? `${formatSI(star.lum)} W` : "Unknown");

		this.displayText = [name, distance, radius, temperature, luminosity];

		this.updateVis();
	}

	highlightEarth()	{
		this.displayData = this.data
		this.updateVis();
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
				d3.select(event.currentTarget)
					.attr("stroke", "#ffffff")
					.attr("stroke-width", 1.5);
			})
			.on("mouseleave", (event) => {
				d3.select(event.currentTarget)
					.attr("stroke", null)
					.attr("stroke-width", null);
			})
			.on("click", (e)	=>	{
				vis.highlightEarth();
			})
			.transition()
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

		vis.toolarea.selectAll("text")
			.data(vis.displayText)
			.join("text")
			.attr("x", 0)
			.attr("y", (d, i) => i * 32)
			.attr("fill", "white")        
			.text(d => d);

	}
}
