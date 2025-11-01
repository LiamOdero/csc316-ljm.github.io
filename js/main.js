
// Variables for the visualization instances
let areachart, timeline;
let data;

const RADIUS_SUN= 696340;
const SUN_LUMINOSITY = 3.83e26;
// 1mil km to light years
const LIGHT_YEAR = 9.461e+12;

// Start application by loading the data
loadData();

function loadData() {
    d3.csv("data/star_dataset.csv"). then(data=>{
            
        data_cleaned = prepareData(data)
        
		console.log(data_cleaned)
        console.log('data loaded ')

		compareChart1 = new ComparisonChart("star-comparison-1" , "highlight-text", true)
		compareChart1.initVis();

		compareChart2 = new ComparisonChart("star-comparison-2" , "highlight-text", false)
		compareChart2.initVis();

		areachart = new StarDisplayChart("stacked-area-chart", data_cleaned, compareChart1, compareChart2);
		areachart.initVis();
		
		minimap = new Minimap("timeline", data.years, areachart)
		minimap.initVis();

		// Set minimap reference in main chart so brush can update it
		areachart.setMinimap(minimap);

		d3.select("#reset-brush-btn").on("click", () => {
			minimap.resetBrush();
		});

		d3.select("#full-extent-btn").on("click", () => {
			minimap.setFullExtent();
		});

		// Initialize filters
		initializeFilters(data_cleaned);
    });
}

function prepareData(data){
	data_cleansed = [];
	data.forEach(e => {
		data_cleansed.push({name: e.Source, 
							dist: +e.Dist, 
							lum: (e["Lum-Flame"]) ? + e["Lum-Flame"] * SUN_LUMINOSITY : NaN, 
							rad: +e.Rad * RADIUS_SUN,
							temp: +e.Teff,
							x_pos: +e.x_pos,
							y_pos: +e.y_pos})
	});

	data_cleansed.sort(function(a, b)	{
		return a.rad - b.rad;
	})

	for (let i = 0; i < data_cleansed.length; i++)	{
		if (i % 2 == 1)	{
			data_cleansed[i].dist *= -1
		}
	}

	return data_cleansed
}

function brushed() {

}

function initializeFilters(data) {
	const distExtent = d3.extent(data, d => Math.abs(d.dist));
	const radExtent = d3.extent(data, d => d.rad);
	const tempExtent = d3.extent(data, d => d.temp);
	const lumExtent = d3.extent(data.filter(d => !isNaN(d.lum)), d => d.lum);

	// filter values
	let filters = {
		distanceMin: distExtent[0],
		distanceMax: distExtent[1],
		radiusMin: radExtent[0],
		radiusMax: radExtent[1],
		temperatureMin: tempExtent[0],
		temperatureMax: tempExtent[1],
		luminosityMin: lumExtent[0],
		luminosityMax: lumExtent[1]
	};

	const formatSI = d3.format(".2e");

	// update display values
	function updateFilterDisplay() {
		d3.select("#distance-value").text(`${formatSI(filters.distanceMin)} - ${formatSI(filters.distanceMax)}`);
		d3.select("#radius-value").text(`${formatSI(filters.radiusMin)} - ${formatSI(filters.radiusMax)}`);
		d3.select("#temp-value").text(`${formatSI(filters.temperatureMin)} - ${formatSI(filters.temperatureMax)}`);
		d3.select("#lum-value").text(`${formatSI(filters.luminosityMin)} - ${formatSI(filters.luminosityMax)}`);
	}

	// apply filters to data
	function applyFilters() {
		const filterCriteria = {
			distanceMin: filters.distanceMin,
			distanceMax: filters.distanceMax,
			radiusMin: filters.radiusMin,
			radiusMax: filters.radiusMax,
			temperatureMin: filters.temperatureMin,
			temperatureMax: filters.temperatureMax,
			luminosityMin: filters.luminosityMin,
			luminosityMax: filters.luminosityMax
		};

		areachart.applyFilters(filterCriteria);
		minimap.applyFilters(filterCriteria);
	}

	// Distance sliders
	d3.select("#distance-slider-min").on("input", function() {
		const minPercent = +this.value;
		const maxPercent = +d3.select("#distance-slider-max").property("value");
		
		if (minPercent > maxPercent) {
			this.value = maxPercent;
			return;
		}
		
		filters.distanceMin = distExtent[0] + (distExtent[1] - distExtent[0]) * (minPercent / 100);
		updateFilterDisplay();
		applyFilters();
	});

	d3.select("#distance-slider-max").on("input", function() {
		const maxPercent = +this.value;
		const minPercent = +d3.select("#distance-slider-min").property("value");
		
		if (maxPercent < minPercent) {
			this.value = minPercent;
			return;
		}
		
		filters.distanceMax = distExtent[0] + (distExtent[1] - distExtent[0]) * (maxPercent / 100);
		updateFilterDisplay();
		applyFilters();
	});

	// radius sliders
	d3.select("#radius-slider-min").on("input", function() {
		const minPercent = +this.value;
		const maxPercent = +d3.select("#radius-slider-max").property("value");
		
		if (minPercent > maxPercent) {
			this.value = maxPercent;
			return;
		}
		
		filters.radiusMin = radExtent[0] + (radExtent[1] - radExtent[0]) * (minPercent / 100);
		updateFilterDisplay();
		applyFilters();
	});

	d3.select("#radius-slider-max").on("input", function() {
		const maxPercent = +this.value;
		const minPercent = +d3.select("#radius-slider-min").property("value");
		
		if (maxPercent < minPercent) {
			this.value = minPercent;
			return;
		}
		
		filters.radiusMax = radExtent[0] + (radExtent[1] - radExtent[0]) * (maxPercent / 100);
		updateFilterDisplay();
		applyFilters();
	});

	// temperature sliders
	d3.select("#temp-slider-min").on("input", function() {
		const minPercent = +this.value;
		const maxPercent = +d3.select("#temp-slider-max").property("value");
		
		if (minPercent > maxPercent) {
			this.value = maxPercent;
			return;
		}
		
		filters.temperatureMin = tempExtent[0] + (tempExtent[1] - tempExtent[0]) * (minPercent / 100);
		updateFilterDisplay();
		applyFilters();
	});

	d3.select("#temp-slider-max").on("input", function() {
		const maxPercent = +this.value;
		const minPercent = +d3.select("#temp-slider-min").property("value");
		
		if (maxPercent < minPercent) {
			this.value = minPercent;
			return;
		}
		
		filters.temperatureMax = tempExtent[0] + (tempExtent[1] - tempExtent[0]) * (maxPercent / 100);
		updateFilterDisplay();
		applyFilters();
	});

	// luminosity sliders
	d3.select("#lum-slider-min").on("input", function() {
		const minPercent = +this.value;
		const maxPercent = +d3.select("#lum-slider-max").property("value");
		
		if (minPercent > maxPercent) {
			this.value = maxPercent;
			return;
		}
		
		filters.luminosityMin = lumExtent[0] + (lumExtent[1] - lumExtent[0]) * (minPercent / 100);
		updateFilterDisplay();
		applyFilters();
	});

	d3.select("#lum-slider-max").on("input", function() {
		const maxPercent = +this.value;
		const minPercent = +d3.select("#lum-slider-min").property("value");
		
		if (maxPercent < minPercent) {
			this.value = minPercent;
			return;
		}
		
		filters.luminosityMax = lumExtent[0] + (lumExtent[1] - lumExtent[0]) * (maxPercent / 100);
		updateFilterDisplay();
		applyFilters();
	});

	// reset button
	d3.select("#reset-filter-btn").on("click", () => {
		filters.distanceMin = distExtent[0];
		filters.distanceMax = distExtent[1];
		filters.radiusMin = radExtent[0];
		filters.radiusMax = radExtent[1];
		filters.temperatureMin = tempExtent[0];
		filters.temperatureMax = tempExtent[1];
		filters.luminosityMin = lumExtent[0];
		filters.luminosityMax = lumExtent[1];

		d3.select("#distance-slider-min").property("value", 0);
		d3.select("#distance-slider-max").property("value", 100);
		d3.select("#radius-slider-min").property("value", 0);
		d3.select("#radius-slider-max").property("value", 100);
		d3.select("#temp-slider-min").property("value", 0);
		d3.select("#temp-slider-max").property("value", 100);
		d3.select("#lum-slider-min").property("value", 0);
		d3.select("#lum-slider-max").property("value", 100);

		updateFilterDisplay();
		applyFilters();
	});

	// initialize display
	updateFilterDisplay();
}
