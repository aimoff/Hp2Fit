const DATE_OF_MEASUREMENT = "1";  // 測定日付
const BODY_WEIGHT = "6021";
const BODY_FAT = "6022";

const healthPlanet = {
  "serviceName": "HealthPlanet",
  "clientId": PropertiesService.getScriptProperties().getProperty('HEALTHPLANET_API_CLIENT_ID'),
  "clientSecret": PropertiesService.getScriptProperties().getProperty('HEALTHPLANET_API_CLIENT_SECRET'),
  "setAuthorizationBaseUrl": "https://www.healthplanet.jp/oauth/auth",
  "tokenUrl": "https://www.healthplanet.jp/oauth/token",
  "innerscanUrl": "https://www.healthplanet.jp/status/innerscan.json",
  "callback": "hpAuthCallback",
  "scope": "innerscan",
  "grantType": "authorization_code",
  "payloadDate": DATE_OF_MEASUREMENT,
  "payloadTag": `${BODY_WEIGHT},${BODY_FAT}`
}

/**
 * HealthPlanet用の認証サービスを取得する。
 */
const getHPService = () => {
  return OAuth2.createService(healthPlanet.serviceName)
    .setAuthorizationBaseUrl(healthPlanet.setAuthorizationBaseUrl)
    .setTokenUrl(healthPlanet.tokenUrl)
    .setClientId(healthPlanet.clientId)
    .setClientSecret(healthPlanet.clientSecret)
    .setCallbackFunction(healthPlanet.callback)
    .setPropertyStore(property)
    .setScope(healthPlanet.scope)
    .setGrantType(healthPlanet.grantt);
}

/**
 * HealthPlanetのOAuth認証が完了したときに呼ばれるコールバック関数。
 */
const hpAuthCallback = (request) => {
  const hpService = getHPService();
  const isAuthorized = hpService.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput("Success!");
  } else {
    return HtmlService.createHtmlOutput("Denied.");
  }
}

/**
 * HealthPlanetからヘルスデータを取得する
 */
const fetchHealthData = (service) => {
  let payload = {
    "access_token": service.getAccessToken(),
    "date": healthPlanet.payloadDate,
    "tag": healthPlanet.payloadTag
  };
  if (HEALTHDATA_PERIOD != null) {
    const now = dayjs.dayjs();
    payload["from"] = now.startOf('day').subtract(HEALTHDATA_PERIOD, 'day').format('YYYYMMDDHHmmss');
  }

  const options = {
    "method": "POST",
    "payload": payload
  };

  const response = UrlFetchApp.fetch(healthPlanet.innerscanUrl, options);
  console.log(payload);
  console.log(response.getContentText());
  return JSON.parse(response);
}

/**
 * ヘルスデータの機器番号から機器名に変換する
 */
const getModelName = (healthData) => {
  const model = healthData.data.slice(-1)[0].model;
  const name = healthPlanetModels[model];
  if (!name) {
    console.log(`Please add "${model}": "YourModelName" to healthPlanetModels{} in models.gs`);
    return model;
  }
  return name;
}

/**
 * Health Planet のデータをリストする（開発用）
 */
const listHPHelthData = () => {
  const hpService = getHPService();

  if (hpService.hasAccess()) {
    const healthData = fetchHealthData(hpService);
    console.log("Model: " + getModelName(healthData));
  } else {
    console.log("Please authorize URL before execute");
  }
}
