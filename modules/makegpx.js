import xml2js from 'xml2js';

function make(name, latlon, altitude){

    let zip = (a1, a2) => a1.map((x, i) => {
        return{
                $:{
                    lat:x[0],
                    lon:x[1],
                },
                ele:a2[i]
        }
    });

    const trkpt = zip(latlon, altitude);

    var builder = new xml2js.Builder();

    var obj = {
        gpx:{
            $:{
                'creator':'Birdview makeGPX',
                'xmlns:xsi':'http://www.w3.org/2001/XMLSchema-instance',
                'xsi:schemaLocation':'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd',
                'version':'1.1',
                'xmlns':'http://www.topografix.com/GPX/1/1'
            },
            trk:{
                name:name,
                type:1,
                trkseg:{
                    trkpt
                }
            }
        }
    }
    var xml = builder.buildObject(obj);
    return xml;
}

export default make;