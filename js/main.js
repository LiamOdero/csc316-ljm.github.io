
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

		// Initialize D3-based controls
		controls = new Controls("controls-container", data_cleaned, minimap);
		controls.initVis();
		controls.setAreachart(areachart);

		// Initialize D3-based filters
		filters = new Filters("filter", data_cleaned, areachart, minimap);
		filters.initVis();
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

// Old initializeFilters function removed - now using D3-based Filters class

