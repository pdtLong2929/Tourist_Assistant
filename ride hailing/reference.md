reference: grab farefeed api
https://developer.grab.com/docs/partner-farefeed/

Estimate

curl -X POST \
  https://partner-api.stg-myteksi.com/farefeed/v1/estimate \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <BEARER_TOKEN_HERE>' \
  -H 'cache-control: no-cache' \
  -d '{
    "pickUp": {
        "latitude": 1.234567, 
        "longitude": 3.456789,
        "address": "marina one"
    },
    "dropOff":{
        "latitude": 1.234567, 
        "longitude": 3.456789,
        "address": "cecil court"
    }
}'

fetch("https://partner-api.stg-myteksi.com/farefeed/v1/estimate", {
  "method": "POST",
  "headers": {
    "authorization": "Bearer <BEARER_TOKEN_HERE>",
    "content-type": "application/json"
  },
  "body": {
    "pickUp": {
      "latitude": 1.234567,
      "longitude": 3.456789,
      "address": "marina one"
    },
    "dropOff": {
      "latitude": 1.234567,
      "longitude": 3.456789,
      "address": "cecil court"
    }
  }
})
.then(response => {
  console.log(response);
})
.catch(err => {
  console.log(err);
});

    Make sure to replace <BEARER_TOKEN_HERE> with your OAuth Token.

    The above command returns JSON structured like this:

{
    "services": [
        {
            "serviceID": 227,
            "serviceName": "GrabShare",
            "eta": 4,
            "fare": {
                "currency": "SGD",
                "maxFare": 68.4,
                "minFare": 51.3
            },
            "deepLink": "https://grab.onelink.me/2695613898?af_dp=grab%3A%2F%2Fopen%3FdropOffAddress%3Dubi%2Bavenue%2B1%26dropOffLatitude%3D1.234567%26dropOffLongitude%3D3.456789%26pickUpAddress%3Dcecil%2Bcourt%252C%2Bcecil%2Bstreet%26pickUpLatitude%3D1.234567%26pickUpLongitude%3D3.456789%26screenType%3DBOOKING%26sourceID%3D%26taxiTypeId%3D227&c=&pid=",
            "directDeepLink": "grab://open?dropOffLatitude=1.234567&dropOffLongitude=3.456789&pickUpLatitude=1.234567&pickUpLongitude=3.456789&screenType=BOOKING&taxiTypeId=227",
            "iconLink": "https://images.grab.com/taxi_type/227/hdpi_icon-12345.png",
            "surgeNotice": "NONE"
        },
        {
            "serviceID": 302,
            "serviceName": "JustGrab",
            "eta": 3,
            "fare": {
                "currency": "SGD",
                "maxFare": 68.4,
                "minFare": 51.3
            },
            "deepLink": "https://grab.onelink.me/2695613898?af_dp=grab%3A%2F%2Fopen%3FdropOffAddress%3Dubi%2Bavenue%2B1%26dropOffLatitude%3D1.234567%26dropOffLongitude%3D3.456789%26pickUpAddress%3Dcecil%2Bcourt%252C%2Bcecil%2Bstreet%26pickUpLatitude%3D1.234567%26pickUpLongitude%3D3.456789%26screenType%3DBOOKING%26sourceID%3D%26taxiTypeId%3D302&c=&pid=",
            "directDeepLink": "grab://open?dropOffLatitude=1.234567&dropOffLongitude=3.456789&pickUpLatitude=1.234567&pickUpLongitude=3.456789&screenType=BOOKING&taxiTypeId=302",
            "iconLink": "https://images.grab.com/taxi_type/302/hdpi_icon-98765.png",
            "surgeNotice": "HIGH_SURGE"
        }
    ]
}

Before you run this API endpoint

    Get the Two legged OAuth2.0 Token by following [Grab ID Link]. The OAuth scope for this API is ride.estimate.
    For testing, use staging URL - https://partner-api.stg-myteksi.com
    For production, use production URL - https://partner-api.grab.com

Endpoint URL: POST /farefeed/v1/estimate

Fetches the fare estimation.

Use the estimate API to fetch estimated fare for the popular ride services provided grab in the given location. Make sure to include:

    Pick-up location - Combination of latitude and longitude
    Drop-off location - Combination of latitude and longitude

Request Header Parameters
Parameter	Type	Description
Content-Type	String	Required.
application/json
Authorization	String	Required.
Bearer {{OAuth Token}}
Request Parameters
Parameter	Type	Description
pickUp	Object	Required.
An Object containing latitude and longitude
pickUp.latitude	Float64	Required.
Latitude of the pick-up point
pickUp.longitude	Float64	Required.
Longitude of the pick-up point
pickUp.address	String	Required.
Address of the pick-up point.
dropOff	Object	Required.
An Object containing latitude and longitude
dropOff.latitude	Float64	Required.
Latitude of the drop-off point
dropOff.longitude	Float64	Required.
Latitude of the drop-off point
dropOff.address	String	Required.
Address of the drop-off point.
Response Parameters
Parameter	Type	Description
services	Array	Array of service feed
serviceID	Integer	Unique identifier of the service offered by Grab
serviceName	String	Name of the service
eta	Integer	Estimated time of arrival of a cab to pick-up the passenger.
The unit of the value is minutes
fare	Object	An object representing the fare estimation.
fare.currency	String	The currency of the fare
fare.maxFare	Float64	An estimated maximum fare for the ride.
fare.minFare	Float64	An estimated minimum fare for thew ride.
deepLink	String	A valid url that can be used to redirect to Grab App. This url can be used even if the Grab App is not installed.
All the search parameters will be pre filled in the Grab App.
directDeepLink	String	A valid url that can be used to redirect to Grab App. This url can be used only if the Grab App is installed already.
All the search parameters will be pre filled in the Grab App.
iconLink	String	A valid url that can be used to get the icon to display in the UI.
surgeNotice	Enum	One of the following values: NONE, LOW_SURGE, HIGH_SURGE, FRACTIONAL_SURGE
Response Header Parameters
Parameter	Type	Description
Content-Type	String	application/json
X-Grabkit-Grab-Requestid	String	Used for debugging. Please mention this value while raising any issues.
HTTP Response codes
Code	Reason
200 OK	When request is as per expectation (Happy path)
400 Bad Request	When Latitude/Longitude are missing.
Latitude and Longitude should be valid.
401 Unauthorized	When Authorization token is missing, invalid or expired.
404 Not Found	When Grab does not provide services at the Latitude and Longitude supplied.
