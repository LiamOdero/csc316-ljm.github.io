EARTH = {name: "Earth", 
						dist: 0, 
						lum: NaN, 
						rad:  6378,
						temp: 288,
						x_pos: 0,
						y_pos: -50}

/*
 * ComparisonChart - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- the data the that's provided initially
 * @param  displayData      -- the data that will be used finally (which might vary based on the selection)
 */

class ComparisonChart {

// constructor method to initialize StarDisplayChart object
constructor(parentElement, textElement, initEarth) {
    this.parentElement = parentElement;
	this.textElement = textElement
	this.compareData = [];
	if (!initEarth)	{
		this.compareData.push({name: "Earth", 
						dist: 0, 
						lum: NaN, 
						rad:  6378,
						temp: 288,
						x_pos: 0,
						y_pos: -50})
	}

	this.initEarth = initEarth;
    this.displayData = []

	// hacky solution to lack of newlines
	this.displayText = ["Click on a star in the chart", "to the left to view it here:"]
	this.colours = ["#ff3300","#fff9fb", "#9dbdff"]

	this.planetColours = {"Mercury": "#E5E5E5", "Venus": "#E5E5E5", "Earth": "#2f6a69", "Mars": "#E27B58",
						  "Jupiter": "#b07f35", "Saturn": "#b08f36", "Uranus": "#5580aa", "Neptune": "#7CB7BB"
	}

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
			.domain([0, 0]);

		vis.y = d3.scaleLinear()
			.range([drawHeight, 0])
			.domain([-50, -50]);

		vis.r = d3.scaleLinear()
			.range([0, drawHeight / 4])
			.domain(d3.extent(vis.compareData, d => d.rad));

		vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", "translate(0," + vis.y(0) + ")");

		if (vis.initEarth)	{
			vis.highlightStar(EARTH);
		}
		vis.updateVis();
	}
	
	highlightStar(star)	{
		
		this.displayData = [star];
		this.compareData.push(star)

		const formatSI = d3.format(".2e");

		let name = "ID: " + ((star.name) ? star.name : "Unknown star");
		let distance = "Distance: " + (Number.isFinite(star.dist) ? `${formatSI(Math.abs(star.dist).toFixed(2))} ly` : "Unknown");
		let radius = "Radius: " + (Number.isFinite(star.rad) ? `${formatSI(star.rad)} km` : "Unknown");
		let temperature = "Temperature: " + (Number.isFinite(star.temp) ? `${formatSI(star.temp)} K` : "Unknown");
		let luminosity = "Luminosity: " + (Number.isFinite(star.lum) ? `${formatSI(star.lum)} W` : "Unknown");

		this.displayText = [name, distance, radius, temperature, luminosity];
		this.updateVis();
	}

	compareStar(star)	{
		this.compareData.push(star);
		this.updateVis();
	}

	clearComparison()	{
		// since compare data should always be length 2, the index of the comparison is whatever index the display star
		// doesnt occupy
		let displayIndex = 1 - this.compareData.indexOf(this.displayData[0]);
		this.compareData.splice(displayIndex, 1);
		this.updateVis();
	}

	clearVis()	{
		// remove the displayed star from data to compare, but keep the comparison
		let displayIndex = this.compareData.indexOf(this.displayData[0]);
		this.compareData.splice(displayIndex, 1);

		this.displayData = [];
		this.displayText = ["Click on a star in the chart", "to the left to view it here:"];

		this.updateVis();
	}

	/*
	 * The drawing function - should use the D3 update sequence (enter, update, exit)
 	* Function parameters only needed if different kinds of updates are needed
 	*/
	updateVis(){
		let vis = this;
		this.r.domain([0, d3.max(vis.compareData, d => d.rad)]);
		let circles = vis.svg.selectAll("circle")	
			.data(vis.displayData);      
		circles.enter().append("circle")
		.merge(circles)
			.attr("fill", function(d) {
				if (d.name in vis.planetColours)	{
					return vis.planetColours[d.name];
				}	else	{
					return vis.colorScale(d.temp); 
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

			})
			.transition()
			.duration(750)
			.attr("cx", function(d) {
				return vis.x(0); 
			})
			.attr("cy", function(d) {
				return vis.y(-50); 
			})
			.attr("r", function(d) {
				return vis.r(d.rad)
			});
		circles.exit().remove()

		vis.toolarea.selectAll("text")
			.data(vis.displayText)
			.join("text")
			.attr("x", 0)
			.attr("y", (d, i) => i * 20)
			.attr("fill", "white")
			.style("font-size", "10px")
			.style("word-wrap", "break-word")
			.text(d => d);

	}
}
