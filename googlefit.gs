const googleFit = {
  "serviceName": "GoogleFit",
  "clientId": PropertiesService.getScriptProperties().getProperty('GOOGLE_API_CLIENT_ID'),
  "clientSecret": PropertiesService.getScriptProperties().getProperty('GOOGLE_API_CLIENT_SECRET'),
  "setAuthorizationBaseUrl": "https://accounts.google.com/o/oauth2/auth",
  "tokenUrl": "https://oauth2.googleapis.com/token",
  "dataSourceUrl": "https://www.googleapis.com/fitness/v1/users/me/dataSources",
  "callback": "gfAuthCallback",
  "scope": "https://www.googleapis.com/auth/fitness.body.write",
  "weight": "com.google.weight",
  "fat": "com.google.body.fat.percentage"
}

/**
 * GoogleFit用の認証サービスを取得する。
 */
const getGFService = () => {
  return OAuth2.createService(googleFit.serviceName)
    .setAuthorizationBaseUrl(googleFit.setAuthorizationBaseUrl)
    .setTokenUrl(googleFit.tokenUrl)
    .setClientId(googleFit.clientId)
    .setClientSecret(googleFit.clientSecret)
    .setCallbackFunction(googleFit.callback)
    .setPropertyStore(property)
    .setScope(googleFit.scope)
    .setParam("login_hint", Session.getActiveUser().getEmail())
    .setParam("access_type", "offline")
    .setParam("approval_prompt", "force");
}

/**
 * GoogleFitのOAuth認証が完了したときに呼ばれるコールバック関数。
 */
const gfAuthCallback = (request) => {
  const gfService = getGFService();
  const isAuthorized = gfService.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput("Success!");
  } else {
    return HtmlService.createHtmlOutput("Denied.");
  }
}

/**
 * GoogleFitにデータソースを作成する。
 */
const createGFDataSource = (service, dataName, model) => {
  const payload = {
    "dataStreamName": GOOGLE_FIT_DATASTREAM_NAME,
    "type": "raw",
    "application": {
      "name": GOOGLE_FIT_APP_NAME
    },
    "dataType": {
      "field": [
        {
          "name": dataName === googleFit.weight ? "weight" : "percentage",
          "format": "floatPoint"
        }
      ],
      "name": dataName
    },
    "device": {
      "manufacturer": "TANITA",
      "model": model,
      "type": "scale",
      "uid": GOOGLE_FIT_DEVICE_UID,
      "version": GOOGLE_FIT_DEVICE_VERSION
    }
  };

  const options = {
    "headers": {
      "Authorization": "Bearer " + service.getAccessToken()
    },
    "muteHttpExceptions": true,
    "method": "POST",
    "contentType": "application/json",
    "payload": JSON.stringify(payload, null, 2)
  };

  const response = UrlFetchApp.fetch(googleFit.dataSourceUrl, options);

  if (response.getResponseCode() === HTTP_STATUS_CODE_CONFLICT) {
    console.log("GoogleFit data source %s is ready", dataName);
  } else if (response.getResponseCode() === HTTP_STATUS_CODE_OK) {
    const json = JSON.parse(response);
    if (!property.getProperty(dataName)) {
      property.setProperty(dataName, json.dataStreamId);
    }
    console.log("GoogleFit data source %s has been created successfully", dataName);
  } else {
    console.log("Failed to create GoogleFit data source %s", dataName);
    console.log(response.getResponseCode());
    console.log(response.getContentText());
  }
}

/**
 * 指定した日付（文字列）の時刻をナノ秒単位の時間に変換する
 */
const convertTimeNS = (dateString) => {
  return dayjs.dayjs(dateString, "YYYYMMDDHHmm").valueOf() * 1000 * 1000;
}
/*
const convertEndTimeNS = (dateString) => {
  return dayjs.dayjs(dateString, "YYYYMMDDHHmm").endOf('minute').valueOf() * 1000 * 1000;
}
*/

/**
 * GoogleFitへヘルスデータ（体重・体脂肪率）を登録する。
 */
const postGFHealthData = (service, dataName, healthData) => {
  createGFDataSource(service, dataName, getModelName(healthData));

  // 登録するデータセットの最小時刻と最大時刻を算出する
  const minTime = Math.min.apply(null, healthData.data.map((elem) => { return elem.date; })).toString();
  const maxTime = Math.max.apply(null, healthData.data.map((elem) => { return elem.date; })).toString();
  const minTimeNs = convertTimeNS(minTime);
  const maxTimeNs = convertTimeNS(maxTime);

  let payload = {
    minStartTimeNs: minTimeNs,
    maxEndTimeNs: maxTimeNs,
    dataSourceId: property.getProperty(dataName),
    point: []
  };

  healthData.data.map((elem) => {
    if ((dataName === googleFit.weight ? BODY_WEIGHT : BODY_FAT) === elem.tag) {
      payload.point.push({
        startTimeNanos: convertTimeNS(elem.date),
        endTimeNanos: convertTimeNS(elem.date),
        dataTypeName: dataName,
        value: [{ fpVal: elem.keydata }]
      });
    }
  });

  const options = {
    "headers": {
      "Authorization": "Bearer " + service.getAccessToken()
    },
    "muteHttpExceptions": true,
    "method": "PATCH",
    "contentType": "application/json",
    "payload": JSON.stringify(payload, null, 2)
  };

  const response = UrlFetchApp.fetch(
    Utilities.formatString(
      "%s/%s/datasets/%s",
      googleFit.dataSourceUrl,
      property.getProperty(dataName),
      `${minTimeNs}-${maxTimeNs}`
    ),
    options
  );

  if (response.getResponseCode = HTTP_STATUS_CODE_OK) {
    console.log("GoogleFit datasets %s have been registered successfully", dataName);
    console.log(response.getContentText());
  } else {
    console.log("Failed to register GoogleFit datasets %s", dataName);
    console.log(response.getResponseCode());
    console.log(response.getContentText());
  }
}
