let Datamap = require('datamaps');
const fs = require('fs');
const path = require('path');

const { ipcMain} = require('electron');


const domain_latlong = JSON.parse(fs.readFileSync(path.join(__dirname,'domain_lat_long.json'), 'utf8'));
const city_latlong = JSON.parse(fs.readFileSync(path.join(__dirname,'city_lat_long.json'), 'utf8'));

var map = new Datamap({
    element: document.getElementById('container'),
    scope: 'usa',
    height:'500',
    weight:'500',
    fills: {
        defaultFill: '#ABDDA4',
        blue: 'blue',
        red: 'red'
      }
}, 
);

function extractText (pdfData) {
    var text = "";
  for (var i = 0; i < pdfData['formImage']['Pages'][0]['Texts'].length; i++ ){
    text += " " + pdfData['formImage']['Pages'][0]['Texts'][i]['R'][0]['T']
  }
  return decodeURIComponent(text); 
}


function get_list(path) {  
    fs.promises.readdir(path).then((data)=> {
    return data.filter(x => x.toLowerCase().indexOf(".pdf") !==-1 ).map(x => path + "/" + x);
}).then((paths) => { 
    return new Promise ((resolve, reject) => {
        ipcRenderer.send( 'prefix-convert-pdf', paths );

        ipcRenderer
        .on('prefix-pdf-converted', ( event, pdfObjs ) => {
            resolve(pdfObjs);
        });
    })

}).then( objs => {  return Promise.all( objs.map(extractText)) })
.then(firstPages => {  
    return Promise.all( firstPages.map ( page => { let ret = page.split(" ").filter( l=> {return l.includes("@")}); return ret; }))
}).then( output => {

    var eduCount = 0; 
    var comCount = 0; 
    var otherCount = 0; 

    output.flat().forEach(e => {

        if (e.split(".").reverse()[0] === "edu"){
            eduCount += 1; 
            ipcRenderer.send( 'edu-count', eduCount );
        } else if ( e.split(".").reverse()[0].indexOf("com") !== -1 ){
            comCount += 1; 
            ipcRenderer.send( 'com-count', comCount );
        } else {
            otherCount += 1; 
            ipcRenderer.send( 'other-count', otherCount );
        }
    });


    var domains =  output.map ( x => x.toString().replace(/{.*}/, '').split(/[,]/) // get rid of {a,b,c}@ domain 
    .map(y => y.split("@")[1]).filter(z => z != undefined)) // remove any empty elements in list 
    .map(aa => aa.map( a=> a.split(".")[a.split(".").length -2] + "." + a.split(".")[a.split(".").length -1])) //extract the domain + TLD 
    .map( b => b.filter( c => domain_latlong[c.toString().toLowerCase()] !== undefined )) //remove anything that we don't have lat-lonng for 
    .filter (d => d.length > 0);

    return domains; 

}).then( domains => {

    max_count = 0; 
    city_counts = {};
    mapped_count = 0; 

    for (var i = 0; i < domains.length; i++){
        curr_domains = Array.from(new Set(domains[i]));
        for (var j = 0; j < curr_domains.length; j++){

            var c = domain_latlong[domains[i][j]];

            mapped_count++; 

            ipcRenderer.send( 'mapped-edu-count', mapped_count );

            if (city_counts[c[1] + "," + c[2]] === undefined){
                city_counts[c[1] + "," + c[2]] = 1 ;
            } else {
                city_counts[c[1] + "," + c[2]] += 1;
                if (city_counts[c[1] + "," + c[2]] > max_count){
                    max_count = city_counts[c[1] + "," + c[2]]; 
                } 
            }
        }
    }

    bubbles = []
    collabs = []
    return [city_counts, domains]; 

}).then( data => {

    city_counts = data[0];
    domains = data[1];
    
    bubbles = [];

    for (c in city_counts){
        lat = city_latlong[c][0];
        long = city_latlong[c][1];
        bubbles.push ({ name: c,
                        latitude: parseFloat(lat), 
                        longitude: parseFloat(long), 
                        radius:7, 
                        fillKey: 'red',
                    }); 
    }

    arcs = [];

    domains.forEach( (d_list  => {
        if (d_list.length > 1){
            sd = Array.from(new Set(d_list));
            for ( var i = 0; i < sd.length-1; i++){
                o = sd[i];
                for (var j =i + 1; j < sd.length; j++ ){
                    
                    d = sd[j];
                    o_lat = domain_latlong[o][4];
                    o_long = domain_latlong[o][5];
                    d_lat = domain_latlong[d][4];
                    d_long = domain_latlong[d][5];

                    if (o_lat === d_lat && o_long === d_long ){
                        //console.log("same location for "+ o + " " + d + " -> all domains: " + d_list);
                    } else {
                        org = {latitude: o_lat, longitude: o_long};
                        des = {latitude: d_lat, longitude: d_long};
                        arcs.push ({ origin : org, destination: des, options: {
                            strokeWidth: 1,
                            strokeColor: '#032a90',
                            greatArc: true
                        }
                    });
                    }
                }
            }
        }
    }) 
    );
    return [bubbles, arcs];

}).then( (output) => {

    bubbles = output[0];
    arcs = output [1];

    map.bubbles( bubbles
        , {
        popupTemplate: function(geo, data) {
          return "<div class='hoverinfo'>It is " + geo['name'] + "</div>";
        }
      });

    map.arc(arcs);

});
};


