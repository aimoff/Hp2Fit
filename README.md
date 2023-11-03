# Health Planet → Google fit/Fitbit 連携ツール (改変版)

当初 [GAS を使って TANITA HealthPlanet のデータを GoogleFit に自動連携してみた](https://qiita.com/potstickers/items/8fa8dce3e31efcde078a)
を基に Google Fit へ反映させようとしてみたが、
時刻等で怪しげな挙動があるために修正しようとしてたどり着いたのがこの [Hp2Fit](https://github.com/YoshihideShirai/Hp2Fit)  
そのままでも動きそうだが、いくつか気になる点を修正・改変

## 改善点

### Health Planet から取得するヘルスデータの日数を限定可能に
Health Planet から毎回最大３ヶ月のヘルスデータを取得して反映させるのは無駄なため、
取得する最大日数を指定できるようにした

- `props.gs` の `HEALTHDATA_PERIOD` で取得・反映したい日数を指定
- `1` を指定すると昨日からのデータのみ取得反映
- `0` では当日分のみ
- 従来と同様に最大限のデータを取得・反映したい場合には `null` を指定

### Google Fit と Fitbit のいずれか一方だけ反映させたい場合に対処
- `props.gs` の `REGIST_GOOGLE_FIT` と `REGIST_FITBIT` で指定

私自身は Fitbit を使っていないこともあり
`props.gs.template` のデフォルトでは Google Fit のみ反映するようになっている

### モデル名を Health Planet からの情報を基に決める
[Health Planet から取得できるモデル名は数字のコード](https://www.healthplanet.jp/apis/api.html)
のため、モデル名への変換テーブル (`models.gs` の `healthPlanetModels`) を基に変換  
ただ、公開されている情報が古いため、最近の機種はテーブルに載っていない  
テーブル上に無い機種では Health Planet から返る数字のコードをモデル名として扱う  
数字のコードでも動作に影響は無いが、名前にしたい場合にはテーブルに使用している機種名を追記する  
`healthplanet.gs` の `listHPHelthData()` を実行すればコンソールログに以下のようにモデルコード番号が表示されるのでそれを基にする
```
Please add "01000XXX": "YourModelName" to healthPlanetModels{} in models.gs
```
最新のヘルスデータの情報を基に決めているので、
機種変更した場合には機種変更前のデータも機種変更後のデータとして取り扱う
（実際には切り替え前の数日間分は新旧両方の機種で同じデータが登録された状態になる）

正直なところ実動作には影響がない自己満足的な改善

## 外形上のコード修正等
- 前述 Health Planet 上のヘルスデータを表示する `listHPHelthData()` を追加
- コード内に埋め込んでいた決め打ちのパラメタを `props.gs` 内で指定
- Google Fit のデータ処理に関する開発用ツール群を別ファイル `googlefit-devel.gs` に分離・整理
- 時刻形式変換のコードを整理
- いくつかの誤記等を修正

## Google Fit 開発用ツールの使い方
元からあったツール群だが、使い方がよくわからず少し試行錯誤したので参考までに…

Google Fit に登録した情報を削除したい場合には `googlefit-devel.gs` 内のツール（関数）を使用する  
新しい機種のモデル名をテーブルに反映させる前のデータを消す等の用途にも使える

1. まず `listGFDataSource()` でデータソースをリストする
2. データソースのリストを基に冒頭の `GF_DATA_STREAM_ID_WEIGHT` や `GF_DATA_STREAM_ID_FAT` を修正する
3. `setDataSourceIdToProperty()` でそれを反映させる
4. 削除したいデータが体重なのか脂肪率なのかにより冒頭近傍の `GF_REMOVE_DATA_NAME` を指定する
5. `removeGFHealthData()` でヘルスデータを削除する
6. `removeGFDataSource()` でデータソースを削除する
7. `listGFDataSource()` でデータソースが消えたことを確認

実際には run() を一度実行すれば 2 や 3 のステップは不要なこともある  
`googleFit.weight` や `googleFit.fat` の扱い方はちょっと特殊

## TODO
- 導入直後の認証部分はわかりづらいので、もうちょっとなんとかしたい
- もうちょっとオブジェクト志向に変えたい  
  まぁ、今の規模だったらそのままでもいいかもしれない
- いずれ Google Fit から [Health Connect](https://health.google/health-connect-android/) に移行するという話もあるので、どうすべきか検討が必要になりそう

以下はオリジナルのドキュメント

-----

# HealthPlanet → Google fit/Fitbit 連携ツール

## 概要

HealthPlanetの体重と体脂肪率を、Google fit/Fitbitに転送するツール。  
Google Apps Script(以下 GAS)を使用しているが、GASにはスケジュール機能があるため、  
自動で連動される。

## 動作環境

- Google Apps Script (googleアカウントがあれば、無料で利用できる。)

## 構築手順
### ソースコードをGoogle Apps Scriptへの取り込み

1. Githubアカウントを持ってなければ作成。
1. Githubで、このリポジトリをForkする。
1. Google Apps Script GitHub アシスタント(以下、GASアシスタント)をインストール & setup
https://chrome.google.com/webstore/detail/google-apps-script-github/lfjcgcmkmjjlieihflfhjopckgpelofo  
https://tonari-it.com/gas-github-assistant-install/  
1. Apps Scriptのプロジェクトを作成する。プロジェクト名はお好みで。  
https://script.google.com/home
1. ForkしたGithubリポジトリが、 GASアシスタントから見えるようになるので、そのリポジトリで mainブランチを指定して 【↓】アイコンのpullを実行する。
1. 本リポジトリにある props.gs.template を、Apps Scriptのプロジェクトに props.gsとしてコピーペースト実施。

### ツールのセットアップ

1. 各種APIに対応するクライアントキーやシークレットを作成する。  
[healthplanet] https://www.healthplanet.jp/create_client_id.do  
`アプリケーションタイプ = Webアプリケーション`  
[fitbit] https://dev.fitbit.com/apps/new  
`OAuth 2.0 Application Type = Personal`,`Default Access Type = Read & Write`  
[Google] 複雑なので、以下参照。  
https://qiita.com/potstickers/items/8fa8dce3e31efcde078a#googlefit-api-%E3%81%AE%E6%BA%96%E5%82%99
1. 上記作成したキー＆シークレットをprops.gsに記載する。
1. props.gsの SCALE_MODELに体組成計のモデル名を記載する。(間違っても動作に影響ないが、Google Fitのデータベースの名前に使われる。)
1. main.gs内のrun()を実行する。
1. 起動すると実行ログにHealthPlanet認証用URLが出力されるので、ブラウザでアクセスする
1. HealthPlanetのログイン画面が表示されるのでログインする
1. HealthPlanetのアクセス許可画面が表示されるのでアクセスを許可する
1. Google Driveの「現在、ファイルを開くことができません。」というエラー画面が表示される
1. HealthPlanetがGASから引き渡したリダイレクトURLのパラメータ部分をカットしていることが  
エラーの原因なので、下記の通りSTATE部分を補う（実行ログからコピー）  
誤）https://script.google.com/macros/d/{SCRIPT ID}/usercallback?code={CODE}  
正）https://script.google.com/macros/d/{SCRIPT ID}/usercallback?code={CODE}&state={STATE}
1. Success!と表示されれば登録が完了。HealthPlanetの連携アプリ一覧にツールが表示される
1. 続いて実行ログにGoogleFit認証用URLが出力されるので、ブラウザでアクセスする
1. 続いて実行ログにFitbit認証用URLが出力されるので、ブラウザでアクセスする
1. 画面の指示に従って認証を完了させる
1. main.gs内のrun()を実行する。これで、データが送信できていれば、OK。

### 定期実行

1. Apps Scriptプロジェクトに、トリガー設定がある。 main.gs内のrun() を 1時間毎などに設定する。

お疲れ様でした！！！

## トラブルシュート

- Google Apps Script GitHub アシスタントで、[GitHub assistant] undefined エラー となり pullできない。  
以下のページに答えがあった。  
https://qiita.com/ryotab22/items/677ab0cd1611062b8ae8  
`Apps Scriptダッシュボードの設定をオンにする`で解決した。

## 参考(というかほぼそのまま)

https://qiita.com/potstickers/items/8fa8dce3e31efcde078a  
https://qiita.com/hirotow/items/d7a6384ff85437d94b0a  
