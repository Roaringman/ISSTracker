const fetch = require('node-fetch');
const request = require('request');

const endpoint = "https://services.arcgis.com/LeHsdRPbeEIElrVR/ArcGIS/rest/services/ISS_track/FeatureServer/0";
const token = "T6Ymm-_BAlDGABe-W1p2-Z-i0fvwUcQCYM0uGED_ukVMWLMNU2SvJbu8W4ErSd-uo1vPYLkpGhLKx9rO3sIhxCm_oRTWGf2yGfQx7_4sY3qgKUDsLG7Oudl8tQI7o6Furc1_Sb8KJQnGyrgLGkEnwRSccCtbWcZa0JkKzMFU81VUz_GKI8bFbdPHoM5GLTuoMZuwNt1hpBJJ5e50lTuepS9QcF01pIJqBEntZUlvmbVhnM7L19kSzBx8xynErXDZmX61sBOk1M0YloC_Rc5eLQ..";
const query = `${endpoint}/addFeatures?token=${token}`;
const countQuery = `${endpoint}/query?where=1%3D1&returnCountOnly=true&f=pjson&token=${token}`;
const updateQuery = `${endpoint}/updateFeatures?token=${token}`;
const firstIdQuery = `${endpoint}/query?where=1+%3D+1&returnIdsOnly=false&orderByFields=time&groupByFieldsForStatistics=time&resultRecordCount=1&f=pjson&token=${token}`;

//Function, interval(Miliseconds), function argument
setInterval(postData, 20000, query, token, endpoint)

async function postData(query, token, endpoint){
  //GET THE ISS POSITION, CREATE HTTP FORM AND POST REQUEST TO ENDPOINT
  const formdata = {};

  let featureCount = await numberOfPositions(countQuery);
  console.log(`There are currently ${featureCount} registered positions in the feature layer`)

  let data = await whereISSAt(); //Await location data promise
  let feature = JSON.stringify({
    "attributes" : {
      "lat": data.latitude,
      "lon": data.longitude,
      "time": data.timestamp,
      "velocity" : data.velocity,
      "altitude" : data.altitude 
    },
      "geometry" : {
        "y" : data.latitude,
        "x" : data.longitude
      }
  })

  if(featureCount < 100) {
    formdata["f"] = "pjson";
    formdata["rollBackOnFailure"] = true;
    formdata["features"] = feature;
  
    request.post({url: query, form: formdata}, async function(err,httpResponse,body){ 
      if(err){console.log(err)}
      else{
        let response = JSON.parse(body)
        if(response.error){
          console.log(`Failed to post position. Error: ${response.error.details[0]}`)
        } else {
          console.log(`Successfully added position with object ID: ${response.addResults[0].objectId} and unique ID: ${response.addResults[0].uniqueId}`)
        }
      }
    })
  } else {
    console.log("Too many features, updating earliest record.")
    let featureId = await firstId(firstIdQuery);

    let id = featureId[0].attributes.OBJECTID;

    let updateFeature = JSON.stringify({
      "attributes" : {
        "OBJECTID" :  id,
        "lat": data.latitude,
        "lon": data.longitude,
        "time": data.timestamp,
        "velocity" : data.velocity,
        "altitude" : data.altitude 
      },
        "geometry" : {
          "y" : data.latitude,
          "x" : data.longitude
        }
    })

    formdata["f"] = "pjson";
    formdata["rollBackOnFailure"] = true;
    formdata["features"] = updateFeature;
  
    request.post({url: updateQuery, form: formdata}, async function(err,httpResponse,body){ 
      if(err){console.log(err)}
      else{
        let response = JSON.parse(body)
        if(response.error){
          console.log(`Failed to post position. Error: ${response.error.details[0]}`)
        } else {
          console.log(`Features with id ${id} was updated with new attributes and geometry`)
        }
      }
    }) 
  }
}

async function whereISSAt(){
    let data = await fetch("https://api.wheretheiss.at/v1/satellites/25544")
    let info =  await data.json();

    return info
}

async function numberOfPositions(query){
  let countData = await fetch(query);
  let countInfo = await countData.json();

  return countInfo.count;
}

async function firstId(query){
  let idData = await fetch(query);
  let idInfo = await idData.json();
  return idInfo.features;
}

async function nextPosition(query){
  let positionData = await fetch(query);
  let positionInfo = await positionData.json();

  return {"x": 0, "y": 0};
}

