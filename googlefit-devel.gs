/**
 * Google Fit のデータ処理に関する開発用ツール群
 */

/**
 * listGFDataSource で取得した dataStreamId を指定する
 * removeGFHealthData() や removeGFDataSource() の際に使用する
 */
const GF_DATA_STREAM_ID_WEIGHT = "raw:com.google.weight:***:TANITA:***:***:TanitaScales";
const GF_DATA_STREAM_ID_FAT = "raw:com.google.body.fat.percentage:***:TANITA:***:***:TanitaScales";

/**
 * removeHealthData() や removeGFDataSource() で処理する対象を指定する
 * 処理したいデータに合わせてコメントアウトを入れ替える
 */
const GF_REMOVE_DATA_NAME = googleFit.weight;
// const GF_REMOVE_DATA_NAME = googleFit.fat;

/**
 * GoogleFitのデータソースをリストする
 */
const listGFDataSource = () => {
  const gfService = getGFService();
  const options = {
    "headers": {
      "Authorization": "Bearer " + gfService.getAccessToken()
    },
    "muteHttpExceptions": true,
    "method": "GET"
  };
  const response = UrlFetchApp.fetch(googleFit.dataSourceUrl, options);
  console.log(response.getResponseCode());
  console.log(response.getContentText());
}

/**
 * プロパティに処理する DataSource 名をセットする
 * removeGFHealthData() や removeGFDataSource() を行う前に実行する
 */
const setDataSourceIdToProperty = () => {
  console.log(property.getProperty(googleFit.weight));
  console.log(property.getProperty(googleFit.fat));
  property.setProperty(googleFit.weight, GF_DATA_STREAM_ID_WEIGHT);
  property.setProperty(googleFit.fat, GF_DATA_STREAM_ID_FAT);
}

/**
 * GoogleFitからヘルスデータを削除する
 */
const removeGFHealthData = () => {
  const dataName = GF_REMOVE_DATA_NAME;

  const gfService = getGFService();
  const listOptions = {
    "headers": {
      "Authorization": "Bearer " + gfService.getAccessToken()
    },
    "muteHttpExceptions": true,
    "method": "GET"
  };
  const listResponse = UrlFetchApp.fetch(
    Utilities.formatString(
      "%s/%s/dataPointChanges",
      googleFit.dataSourceUrl,
      property.getProperty(dataName),
    ),
    listOptions
  );
  console.log(listResponse.getResponseCode());
  console.log(listResponse.getContentText());

  const json = JSON.parse(listResponse);

  // 登録されたデータセットの最小時刻と最大時刻を算出する
  const minTime = Math.min.apply(null, json.insertedDataPoint.map((elem) => { return elem.startTimeNanos; })).toString();
  const maxTime = Math.max.apply(null, json.insertedDataPoint.map((elem) => { return elem.endTimeNanos; })).toString();

  const deleteOptions = {
    "headers": {
      "Authorization": "Bearer " + gfService.getAccessToken()
    },
    "muteHttpExceptions": true,
    "method": "DELETE"
  };
  const deleteResponse = UrlFetchApp.fetch(
    Utilities.formatString(
      "%s/%s/datasets/%s",
      googleFit.dataSourceUrl,
      property.getProperty(dataName),
      `${minTime}-${maxTime}`
    ),
    deleteOptions
  );
  console.log(listResponse.getResponseCode());
  console.log(listResponse.getContentText());
}

/**
 * GoogleFitのデータソースを削除する
 * データを削除するには事前に全てのヘルスデータが削除されている必要がある
 */
const removeGFDataSource = () => {
  const dataName = GF_REMOVE_DATA_NAME;

  const gfService = getGFService();
  const options = {
    "headers": {
      "Authorization": "Bearer " + gfService.getAccessToken()
    },
    "muteHttpExceptions": true,
    "method": "DELETE"
  };
  const response = UrlFetchApp.fetch(
    Utilities.formatString(
      "%s/%s",
      googleFit.dataSourceUrl,
      property.getProperty(dataName)
    ),
    options
  );
  console.log(response.getResponseCode());
  console.log(response.getContentText());
}
