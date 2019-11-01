const fetch = require('node-fetch');
const request = require('request');

const endpoint = "https://services.arcgis.com/LeHsdRPbeEIElrVR/ArcGIS/rest/services/ISS_track/FeatureServer/0";
const token = "Ma3eVnkzBuHfdGaBSwHlLduTgQSbb9Yd-f-mQvJssKddCd93HveK62BJfz70PwpFFsdLpSEf5DhdCzsqj2wICa5kc2KF21S3ZoARubExT9S_FzEUfhJTMt0JCdOqYGRRffN4_zH8rGue6oQnJt-Y3AST-m8xpAezHJhSQvmCHUq4guIsAkJG3RE34ssx7SYkXPBSPyTdB020bVRHvuuKjujKK1W_8FyyhsBP56s3yTFaTDPCWKzzI1SSpt3nfYyttGfEdNmwyyLNjge9YzbygQ..";
const query = `${endpoint}/addFeatures?token=${token}`;
const countQuery = `${endpoint}/query?where=1%3D1&returnCountOnly=true&f=pjson&token=${token}`;
const updateQuery = `${endpoint}/updateFeatures?token=${token}`;
const firstIdQuery = `${endpoint}/query?where=1+%3D+1&returnIdsOnly=false&orderByFields=time&groupByFieldsForStatistics=time&resultRecordCount=1&f=pjson&token=${token}`;

//Inital call
postData(query);
//Function, interval(Miliseconds), function argument
setInterval(postData, 20000, query)

async function postData(query){
  //GET THE ISS POSITION, CREATE HTTP FORM AND POST REQUEST TO ENDPOINT
  const formdata = {};

  let featureCount = await numberOfPositions(countQuery);
  console.log(`There are currently ${featureCount} registered positions in the feature layer`)

  let data = await whereISSAt(); //Await location data promise
  let feature = {
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
  }

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
  
    formPoster(formdata);
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

function formPoster(formdata, query) {
  
  let stringToPost = JSON.stringify(formdata);


  request.post({url: updateQuery, form: stringToPost}, async function(err,httpResponse,body){ 
    if(err){console.log(err)}
    else{
      let response = JSON.parse(body)
      if(response.error){
        console.log(`Failed to post position. Error: ${response.error.details[0]}`)
      } else {
        console.log(`Features with id ${formdata.attributes["OBJECTID"]} was updated with new attributes and geometry`)
      }
    }
  }) 
}