# 外来診療予約システム

このプロジェクトは、外来診療の予約を管理するためのシステムです。バックエンドはNode.js (Express) と JSONファイルベースの簡易データベース、フロントエンドはReactで構築されています。Docker Compose を使用して、簡単に開発環境を構築・実行できます。

## 目次

- [機能](#機能)
- [技術スタック](#技術スタック)
- [開発環境の構築](#開発環境の構築)
- [ステージング環境でのデプロイ](#ステージング環境でのデプロイ)
- [本番環境でのデプロイ](#本番環境でのデプロイ)
- [メール通知機能について](#メール通知機能について)
- [APIドキュメント](#apiドキュメント)
- [貢献](#貢献)
- [ライセンス](#ライセンス)

## 機能

- **リアルタイム更新:**
  - 予約や予約不可設定の変更が、画面を再読み込みせずにリアルタイムで反映されます。
- **カレンダー表示の改善:**
  - 週表示カレンダーで、予約種別（外来診療、訪問診療、通所リハ会議）に応じて背景色が色分けされます。
  - 月表示カレンダーで、土日の日付が視覚的に分かりやすくグレーアウトされます。
- **予約ルールの追加:**
  - 毎週水曜日の午後（13:00以降）は、全ての予約種別で予約ができないようになりました。該当時間帯はカレンダー上でグレーアウトされ、予約フォームでも選択・登録ができません。
- **予約フォームの改善:**
  - 「診察内容」が、固定リストからの選択式になりました。「その他」を選択した場合は、詳細を自由に入力できるテキストフィールドが表示されます。
- **管理者によるユーザー作成:**
  - 管理者権限を持つユーザーのみが新しいユーザーを作成できます。
  - 新規ユーザーには自動生成された初期パスワードが割り当てられ、指定されたメールアドレスに通知されます。
  - 初回ログイン時にパスワードの変更が強制されます。
- **予約の追加、更新、削除:**
  - 予約更新時には、変更された項目がメール通知に明記されます（例: 日時: 2025-08-01 11:00 → 2025-08-01 10:30）。
  - 予約削除時には、予約種別に応じた詳細情報が通知メールに記載されます。
  - 予約操作中にローディングインジケーターが表示され、ユーザー体験が向上しました。
- **予約不可時間帯の設定:**
  - 予約不可設定の変更中にローディングインジケーターが表示され、ユーザー体験が向上しました。
- **ユーザー管理（管理者権限）:**
  - ユーザーの作成、更新、削除操作中にローディングインジケーターが表示され、ユーザー体験が向上しました。
  - 閲覧ユーザーには「一括操作」ボタンが表示されません。
- **メール通知機能:**
  - 予約、予約不可設定の変更時、新規ユーザー作成時にメール通知が送信されます。
  - 送信元メールアドレスを環境変数で管理できるようになりました。
- **`patientId` の数字のみバリデーション:**
  - フロントエンド・バックエンド両方で実装されています。

## 技術スタック

- **バックエンド:** Node.js, Express.js, TypeScript, `dayjs`, `nodemailer`, `socket.io`
- **フロントエンド:** React, TypeScript, Material-UI, `dayjs`, `react-router-dom`, `socket.io-client`
- **データベース:** JSONファイル (db.json)
- **コンテナ化:** Docker, Docker Compose

## 開発環境の構築

### 前提条件

- Docker Desktop (Docker Engine と Docker Compose を含む) がインストールされていること。

### セットアップ手順

1.  **リポジトリのクローン**

    ```bash
    git clone https://github.com/your-username/outpatient-clinic-reservation-system.git
    cd outpatient-clinic-reservation-system
    ```

2.  **環境変数の設定**

    プロジェクトのルートディレクトリに移動し、`backend` と `frontend` ディレクトリ内にそれぞれ `.env.development` ファイルを作成します。

    -   **`backend/.env.development`**
        ```env
        # SMTPサーバーの設定 (開発用)
        SMTP_HOST=localhost
        SMTP_PORT=1025
        SMTP_USER=
        SMTP_PASS=
        SMTP_FROM_ADDRESS=noreply@localhost.dev

        # システムのURL (フロントエンドのURLと合わせる)
        SYSTEM_URL=http://localhost:3000
        ```
        `SMTP_USER` と `SMTP_PASS` は、ご利用のメールサービスで生成した**アプリパスワード**に置き換えてください。GmailやYahoo!メールでは、通常のログインパスワードは使用できません。

    -   **`frontend/.env.development`**
        ```env
        # WebSocketサーバーのURL
        REACT_APP_WEBSOCKET_URL=ws://localhost:3001
        ```

3.  **Docker Compose の実行**

    プロジェクトのルートディレクトリで、以下のコマンドを実行してコンテナをビルドし、起動します。

    ```bash
    docker-compose up --build
    ```

    -   `docker-compose up`: `docker-compose.yml` に基づいてサービスを起動します。
    -   `--build`: イメージが存在しない場合や、Dockerfile が変更された場合にイメージを再ビルドします。

4.  **アプリケーションへのアクセス**

    コンテナが正常に起動したら、以下のURLでアプリケーションにアクセスできます。

    -   **フロントエンド:** `http://localhost:3000`
    -   **バックエンドAPI:** `http://localhost:3001`

    **初期ユーザー情報:**
    `backend/db.json` に以下の初期ユーザーが登録されています。

    -   **管理者:**
        -   ユーザーID: `admin`
        -   パスワード: `password`
    -   **一般ユーザー:**
        -   ユーザーID: `user1`
        -   パスワード: `user1`
    -   **閲覧ユーザー:**
        -   ユーザーID: `user2`
        -   パスワード: `user2`

    **重要:**
    ログイン後、管理者アカウントで「ユーザー管理」画面から新しいユーザーを作成し、メールアドレスを設定してください。新規ユーザー作成時、予約や予約不可設定の変更時にメールが送信されます。バックエンドのDockerログにEthereal.emailのプレビューURLが表示されるか、設定したメールアドレスに実際にメールが届くか確認してください。

    ```bash
    docker logs outpatient-clinic-reservation-system-backend-1
    ```

## ステージング環境でのデプロイ

ステージング環境では、本番環境に近い形で動作確認を行うための環境です。

1.  **ステージング用 `.env` ファイルの作成**

    `backend` と `frontend` ディレクトリ内に、それぞれ `backend/.env.staging` と `frontend/.env.staging` ファイルを作成します。

    -   **`backend/.env.staging`**
        ```env
        # 実際のSMTPサーバーの設定 (ステージング用)
        SMTP_HOST=your_staging_smtp_host
        SMTP_PORT=587
        SMTP_USER=your_staging_smtp_user
        SMTP_PASS=your_staging_smtp_pass
        SMTP_FROM_ADDRESS=noreply@your-staging-app-url.com
        # ステージング環境のシステムのURL
        SYSTEM_URL=https://your-staging-app-url.com
        ```

    -   **`frontend/.env.staging`**
        ```env
        # ステージング環境のWebSocketサーバーのURL
        REACT_APP_WEBSOCKET_URL=wss://your-staging-app-url.com
        ```

2.  **ステージング環境用 Docker Compose の実行**

    以下のコマンドを実行して、ステージング環境用のコンテナをビルドし、起動します。

    ```bash
    docker-compose -f docker-compose.staging.yml up --build -d
    ```

## 本番環境でのデプロイ

本番環境では、開発環境とは異なる環境変数を使用することを推奨します。

1.  **本番用 `.env` ファイルの作成**

    `backend` と `frontend` ディレクトリ内に、それぞれ `backend/.env.production` と `frontend/.env.production` ファイルを作成します。

    -   **`backend/.env.production`**
        ```env
        # 実際のSMTPサーバーの設定
        SMTP_HOST=your_production_smtp_host
        SMTP_PORT=587
        SMTP_USER=your_production_smtp_user
        SMTP_PASS=your_production_smtp_pass
        SMTP_FROM_ADDRESS=noreply@your-production-app-url.com
        # 本番環境のシステムのURL
        SYSTEM_URL=https://your-production-app-url.com
        ```

    -   **`frontend/.env.production`**
        ```env
        # 本番環境のWebSocketサーバーのURL
        REACT_APP_WEBSOCKET_URL=wss://your-production-app-url.com:3334
        ```

2.  **本番環境用 Docker Compose の実行**

    以下のコマンドを実行して、本番環境用のコンテナをビルドし、起動します。

    ```bash
    docker-compose -f docker-compose.prod.yml up --build -d
    ```

## メール通知機能について

-   メール送信には `nodemailer` を使用しています。
-   開発環境では、`Ethereal.email` を利用して実際のメール送信なしにメールの内容を確認できます。バックエンドのログに出力されるURLを確認してください。
-   本番環境で実際にメールを送信するには、`backend/.env.production` に実際のSMTPサーバーの認証情報を設定する必要があります。

## APIドキュメント

(ここにAPIドキュメントへのリンクや、主要なエンドポイントの概要を記載できます)

## 貢献

(貢献に関するガイドラインや、コントリビューターのリストを記載できます)

## ライセンス

(プロジェクトのライセンス情報を記載できます)