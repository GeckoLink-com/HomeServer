
## Intro
GeckoLink HomeServerのソースコードです。
詳しい使い方の説明は
<https://geckolink.com>
にあります。
Node.js v8.9.1で動作確認しています。

    # git@github.com:GeckoLink-com/HomeServer.git
    # cd HomeServer
    # npm install
    # webpack
    # node backend/HomeServer

を実行後
<http://localhost:4080>
を開くとlogin windowが開くので初期パスワード

    user: admin
    passwd: gecko

でlogin後、account / passwordを設定してください。

SSHの公開鍵ファイル設定はRaspberryPiのイメージ用です。  
間違っても**自分の開発環境でファイルを登録しない**でください。
`~/.ssh/authorized_key`を書き換えてしまいます。

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright (C) 2016-2017 Mitsuru Nakada
