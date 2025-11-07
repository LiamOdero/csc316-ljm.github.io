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

    this.initEarth = initEarth;
    this.displayData = []
	this.activationCallback = null;
	this.isActive = false;
	this.defaultReferenceStar = initEarth ? null : EARTH;
	this.referenceStar = this.defaultReferenceStar;
	this.displayText = [];
	this.updatePlaceholderText();
	this.refreshCompareData();

	// hacky solution to lack of newlines handled via updatePlaceholderText
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

		vis.margin = {top: 0, right: 0, bottom: 10, left: 0};

		vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

		vis.container = d3.select("#" + vis.parentElement);
		vis.container.on("click", (event) => {
			const clickedButton = event.target.closest ? event.target.closest("button") : (event.target.tagName === "BUTTON");
			if (clickedButton) {
				return;
			}
			if (vis.activationCallback) {
				vis.activationCallback(vis);
			}
		});

		const totalWidth = vis.width + vis.margin.left + vis.margin.right;
		const totalHeight = vis.height;
		const computedToolHeight = totalHeight / 4;
		vis.infoBoxSize = {
			width: 360,
			height: 160,
			paddingX: 18,
			paddingY: 25,
			marginTop: 10,
			lineHeight: 28,
			fontSize: 13
		};
		vis.toolHeight = Math.max(computedToolHeight, vis.infoBoxSize.height + vis.infoBoxSize.marginTop);

		vis.toolarea = d3.select("#" + vis.parentElement)
			.append("svg")
			.attr("width", totalWidth)
			.attr("height", vis.toolHeight + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + 5 + "," + vis.margin.top + ")");

		vis.toolInnerWidth = totalWidth - 10;

		vis.infoGroup = vis.toolarea.append("g");
		vis.infoBackground = vis.infoGroup.append("rect")
			.attr("rx", 10)
			.attr("ry", 10)
			.attr("fill", "rgba(255, 255, 255, 0.05)")
			.attr("stroke", "rgba(255, 255, 255, 0.25)")
			.attr("stroke-width", 1)
			.attr("y", vis.infoBoxSize.height);
		vis.infoTextGroup = vis.infoGroup.append("g");
		vis.infoContent = vis.infoGroup.append("foreignObject");
		vis.infoContentDiv = vis.infoContent.append("xhtml:div")
			.attr("class", "comparison-info-text");
		const drawHeight = 160;
		const bottomPadding = 20;
		const topPadding = 10;

		vis.svg = d3.select("#" + vis.parentElement)
			.append("svg")
			.attr("width", totalWidth)
			.attr("height", drawHeight + bottomPadding + topPadding)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + topPadding + ")");


		vis.text = d3.select('#' + vis.textElement)
		vis.text.text("Click any star:")

		// Scales and axes

		vis.x = d3.scaleLinear()
			.range([0, vis.width])
			.domain([0, 0]);

		vis.y = d3.scaleLinear()
			.range([drawHeight, 0])
			.domain([-50, -50]);

		const initialMaxRadius = this.compareData.length ? d3.max(this.compareData, d => d.rad) : 1;
		vis.r = d3.scaleLinear()
			.range([0, drawHeight / 2])
			.domain([0, initialMaxRadius || 1]);

		vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", "translate(0," + vis.y(0) + ")");

		if (vis.initEarth)	{
			vis.highlightStar(EARTH);
		}
		vis.updateVis();
	}

	setActivationHandler(callback) {
		this.activationCallback = callback;
	}

	setSelected(isSelected) {
		this.isActive = isSelected;
		d3.select("#" + this.parentElement)
			.classed("comparison-card--active", !!isSelected);

		if (!this.displayData.length) {
			this.updatePlaceholderText();
			this.updateVis();
		}
	}

	updatePlaceholderText() {
		if (this.displayData && this.displayData.length) {
			return;
		}

		const lines = this.isActive ? ["Click on a star in the chart on the left to view it here"] : 
		["Select this section then click on a star in the chart on the left to view it here"];
		this.displayText = lines;
	}

	refreshCompareData() {
		this.compareData = [];

		if (this.displayData && this.displayData.length) {
			this.compareData.push(this.displayData[0]);
		}

		if (this.referenceStar && (!this.displayData.length || this.referenceStar !== this.displayData[0])) {
			this.compareData.push(this.referenceStar);
		}

	}
	
	highlightStar(star)	{
		
		this.displayData = [star];
		this.refreshCompareData();

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
		this.referenceStar = star || null;
		this.refreshCompareData();
		this.updateVis();
	}

	clearComparison()	{
		this.referenceStar = null;
		this.refreshCompareData();
		this.updateVis();
	}

	clearVis()	{
		this.displayData = [];
		this.updatePlaceholderText();
		this.refreshCompareData();

		this.updateVis();
	}

	/*
	 * The drawing function - should use the D3 update sequence (enter, update, exit)
 	* Function parameters only needed if different kinds of updates are needed
 	*/
	updateVis(){
		let vis = this;
		const maxRadius = vis.compareData.length ? d3.max(vis.compareData, d => d.rad) : 1;
		this.r.domain([0, maxRadius || 1]);
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

		const infoBoxWidth = Math.min(vis.infoBoxSize.width, vis.toolInnerWidth);
		const infoBoxX = (vis.toolInnerWidth - infoBoxWidth) / 2;
		const infoBoxY = vis.infoBoxSize.marginTop;
		const infoBoxHeight = vis.infoBoxSize.height;
		const lineHeight = vis.infoBoxSize.lineHeight;
		const paddingX = vis.infoBoxSize.paddingX;
		const paddingY = vis.infoBoxSize.paddingY;
		const fontSize = vis.infoBoxSize.fontSize;
		const infoLines = vis.displayText;

		vis.infoBackground
			.attr("x", infoBoxX)
			.attr("y", infoBoxY)
			.attr("width", infoBoxWidth)
			.attr("height", infoBoxHeight);

		const isPlaceholder = !vis.displayData.length;

		if (isPlaceholder) {
			vis.infoContent
				.style("display", "block")
				.attr("x", infoBoxX)
				.attr("y", infoBoxY)
				.attr("width", infoBoxWidth)
				.attr("height", infoBoxHeight);

			const paragraphs = vis.infoContentDiv
				.style("padding", `${paddingY}px ${paddingX}px`)
				.style("height", "100%")
				.style("box-sizing", "border-box")
				.selectAll("p")
				.data(infoLines, (d, i) => `${d}-${i}`);

			paragraphs.enter()
				.append("p")
				.merge(paragraphs)
				.style("margin", i => i === infoLines.length - 1 ? "0" : "0 0 8px 0")
				.style("font-size", `${fontSize}px`)
				.text(d => d);

			paragraphs.exit().remove();

			vis.infoTextGroup.selectAll("text").remove();
			vis.infoTextGroup.attr("display", "none");
		} else {
			vis.infoContent.style("display", "none");

			vis.infoTextGroup
				.attr("display", null)
				.attr("transform", `translate(${infoBoxX}, ${infoBoxY})`);

			vis.infoTextGroup.selectAll("text")
				.data(infoLines)
				.join("text")
				.attr("x", paddingX)
				.attr("y", (d, i) => paddingY + (i * lineHeight))
				.attr("fill", "#ffffff")
				.style("font-size", `${fontSize}px`)
				.text(d => d);
		}

	}
}
