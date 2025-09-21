# 外来予約システム (Outpatient Clinic Reservation System)

このプロジェクトは、病院外来診療向けのウェブベースの予約管理システムです。スタッフ、管理者が効率的に予約を管理し、診療スケジュールを最適化することを目的としています。

## 主な機能

- **予約管理**: 外来診療、訪問診療、通所リハビリ会議などの予約を作成、表示、編集、削除。
- **カレンダービュー**: 月次および週次カレンダーで予約状況を視覚的に表示。
- **ユーザー管理**: 管理者、一般、閲覧の3つの権限レベルを持つユーザーを管理。
- **予約不可時間帯の設定**: 特定の日時や終日を予約不可としてブロック。
- **特別予約**: 通常の診療時間外の予約を管理。
- **メール通知**: 予約の作成やキャンセル時にメールで通知。

## 技術スタック

- **フロントエンド**: React, TypeScript, Material-UI (MUI)
- **バックエンド**: Node.js, Express, TypeScript
- **データベース**: Supabase (PostgreSQL)
- **インフラストラクチャ**: Docker, Render

## システム構成

このシステムは、フロントエンド、バックエンド、データベースの3層で構成されています。アプリケーションはDockerコンテナとしてRender上にデプロイされています。

```mermaid
graph TD
    subgraph "クライアント"
        A["ユーザーブラウザ"]
    end

    subgraph "インフラストラクチャ (Render)"
        B["Frontend (React + Nginx)"]
        C["Backend (Node.js + Express)"]
    end

    subgraph "データベース (Supabase)"
        D["PostgreSQL データベース"]
    end

    A -- "HTTPS" --> B
    B -- "APIリクエスト" --> C
    C -- "DBアクセス" --> D
```

-   **フロントエンド (Frontend):**
    -   React (TypeScript) で構築されたSPA（シングルページアプリケーション）です。
    -   Nginxコンテナ上で静的ファイルとしてホスティングされます。
    -   ユーザー認証やデータの表示、操作のためのUIを提供します。

-   **バックエンド (Backend):**
    -   Node.jsとExpress (TypeScript) で構築されたAPIサーバーです。
    -   ビジネスロジックを処理し、SupabaseのPostgreSQLデータベースにアクセスします。
    -   JWT（JSON Web Token）を発行・検証し、APIの認証・認可を行います。

-   **データベース (Database):**
    -   Supabaseを利用し、PostgreSQLデータベースとして使用しています。

---

## 環境構築

### 前提条件

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) (v18以降)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (マイグレーション管理用)

### ローカル開発環境セットアップ

1.  **リポジトリをクローン**
    ```bash
    git clone https://github.com/minamiotaru-hospital/outpatient-clinic-reservation-system.git
    cd outpatient-clinic-reservation-system
    ```

2.  **環境変数の設定**
    開発には共有のSupabaseインスタンスを使用します。`frontend`と`backend`の両ディレクトリに、サンプルファイルをコピーして`.env`ファイルを作成してください。

    -   **バックエンド用**
        ```bash
        cp backend/.env_sample backend/.env
        ```
    -   **フロントエンド用**
        ```bash
        cp frontend/.env.sample frontend/.env
        ```

    作成した`.env`ファイルを、開発用Supabaseインスタンスの認証情報や、各サービスのAPIキーで更新します。（詳細は後述の「環境変数」セクションを参照）

3.  **アプリケーションの起動**
    Docker Composeを使用して、フロントエンドとバックエンドのコンテナを起動します。
    ```bash
    docker-compose up --build -d
    ```

4.  **アクセス**
    -   フロントエンド: `http://localhost:3333`
    -   バックエンド API: `http://localhost:3334`

---

## 環境変数

### `backend/.env`

| 変数名                      | 説明                                                                       | 例                                        |
| --------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| `SUPABASE_URL`              | SupabaseプロジェクトのURL。                                                | `https://<id>.supabase.co`                |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseの`service_role`キー。バックエンドで権限をバイパスするために使用。 | `ey...`                                   |
| `SMTP_HOST`          | メール送信用。SMTPホスト名                                          | `smtp.gmail.com`などお使いのホスティングサービス                                  |
| `SMTP_PORT`          | SMTPポート                                          | `587` お使いのホスティングサービスメール送信用ポート                                 |
| `SMTP_USER`          | お使いのメールアドレス                                          | `example@gmail.com`                                  |
| `SMTP_PASS`          | メールパスワード                                          |                                   |
| `SMTP_FROM_ADDRESS`                | 通知メールの送信元アドレス。                                               | `noreply@example.com`                     |
| `SYSTEM_URL`                | フロントエンドのURL                                              | `http://localhost:3333`                     |
| `JWT_SECRET`                | JWTの署名に使用する秘密鍵。任意のランダムな文字列。                        | `your-super-secret-jwt-key`               |

### `frontend/.env`

| 変数名                         | 説明                                                              | 例                                        |
| ------------------------------ | ----------------------------------------------------------------- | ----------------------------------------- |
| `REACT_APP_API_URL`            | バックエンドAPIサーバーのURL。                                    | `http://localhost:3334/api`               |
| `REACT_APP_SUPABASE_URL`       | SupabaseプロジェクトのURL。                                       | `https://<id>.supabase.co`                |
| `REACT_APP_SUPABASE_ANON_KEY`  | Supabaseの`anon`キー。フロントエンドで安全に使用できる公開キー。  | `ey...`                                   |
| `REACT_APP_WEBSOCKET_URL`      | リアルタイム更新用のWebSocketサーバーのURL。                      | `ws://localhost:3001`                     |
| `REACT_APP_SITE_NAME_SUFFIX=`      | 環境別サフィックス                      | `ヘッダー左上のシステム名後ろに環境判別できるように`                     |

---

## デプロイ

### 1. Supabase

1.  [Supabase公式サイト](https://supabase.com)で新しいプロジェクトを作成します。
2.  本番環境用と開発・ステージング環境用の2つプロジェクトを作成します。
3.  作成したプロジェクトとローカル環境をリンクします。
    ```bash
    supabase link --project-ref <your-project-id>
    ```
4.  ローカルのマイグレーションファイルを本番データベースに適用します。
    ```bash
    supabase db push
    ```
5.  Supabaseプロジェクトの「Project Settings」>「API」で、本番用と開発・ステージング用のURLと`anon`/`service_role`キーを取得し、Renderの環境変数に設定します。

### 2. Render

このアプリケーションは、バックエンドとフロントエンドをそれぞれ別のサービスとしてRenderにデプロイします。

#### バックエンド (Web Service)

-   **Runtime**: `Docker`
-   **リポジトリ**: 設定済み
-   **Dockerfile Path**: `./backend/Dockerfile`
-   **Start Command**: `npm start`
-   **環境変数**: 上記の`backend/.env`の内容をRenderの環境変数設定画面に追加します。
-   **環境作成**: 本番用と開発・ステージング環境用で2つ作成します。それぞれで環境変数を設定。

#### フロントエンド (Static Site)

-   **リポジトリ**: 設定済み
-   **Build Command**: `npm run build`
-   **Publish Directory**: `./frontend/build`
-   **環境変数**: 上記の`frontend/.env`の内容をRenderの環境変数設定画面に追加します。`REACT_APP_API_URL`には、デプロイしたバックエンドサービスのURL（`.onrender.com`で終わるもの）を設定します。
-   **環境作成**: 本番用と開発・ステージング環境用で2つ作成します。それぞれで環境変数を設定。

### 3. CI/CD（自動デプロイ）

このプロジェクトでは、RenderのGit連携機能を利用して、特定のブランチへのプッシュをトリガーとした自動デプロイを設定しています。

-   **開発・ステージング環境**:
    -   `develop`ブランチにプッシュされると、開発・ステージング環境に自動でデプロイが実行されます。

-   **本番環境**:
    -   `develop`ブランチでの動作確認後、変更を`main`ブランチにマージしてプッシュします。
    -   `main`ブランチにプッシュされると、本番環境に自動でデプロイが実行されます。

## データベースバックアップ (Database Backup)

このプロジェクトでは、GitHub Actionsを利用してSupabaseデータベースの自動バックアップを毎日実行しています。

### バックアップの概要

-   **実行頻度**: 毎日、日本時間18時 (UTC 9時)
-   **保存期間**: バックアップファイルは7日間保持されます。
-   **対象**: データベースのロール、スキーマ、データが完全にバックアップされます。
-   **環境別設定**:
    -   `main`ブランチからの実行時: 本番環境のデータベース (`DATABASE_URL_PRODUCTION`) をバックアップします。
    -   `develop`ブランチからの実行時: ステージング環境のデータベース (`DATABASE_URL_STAGING`) をバックアップします。

### バックアップファイルの取得方法

バックアップファイルは、GitHub Actionsの実行結果ページから**アーティファクト**としてダウンロードできます。

1.  GitHubリポジトリの「**Actions**」タブに移動します。
2.  「Daily Supabase DB Backup」ワークフローの最新の（成功した）実行を選択します。
3.  実行結果ページの右側にある「**Artifacts**」セクションから「**supabase-backup**」をダウンロードします。
4.  ダウンロードしたZIPファイルには、以下の3つのSQLファイルが含まれています。
    -   `backup-roles-YYYYMMDD_HHMMSS.sql`
    -   `backup-schema-YYYYMMDD_HHMMSS.sql`
    -   `backup-data-YYYYMMDD_HHMMSS.sql`

### データベースの復元手順

バックアップファイルからデータベースを復元する際は、以下の手順に従ってください。**本番環境で実行する前に、必ずステージング環境や開発環境で十分にテストしてください。**

1.  **psqlコマンドラインツールのインストール**:
    `psql`はPostgreSQLのクライアントツールであり、データベースの復元に必要です。お使いのOSに合わせてインストールしてください。

    -   **macOS**: Homebrewを使用
        ```bash
        brew install libpq
        ```
        インストール後、`psql`コマンドへのパスを通す必要がある場合があります。お使いのMacのCPUによってパスが異なります。

        -   **Appleシリコン (M1/M2/M3など) の場合:**
            ```bash
            echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
            source ~/.zshrc
            ```
        -   **Intel Mac の場合:**
            ```bash
            echo 'export PATH="/usr/local/opt/libpq/bin:$PATH"' >> ~/.zshrc
            source ~/.zshrc
            ```
        *お使いのシェルがBashの場合は、`~/.zshrc`を`~/.bashrc`に置き換えてください。*
    -   **Debian/Ubuntu**:
        ```bash
        sudo apt update
        sudo apt install postgresql-client
        ```
    -   **Fedora/CentOS**:
        ```bash
        sudo dnf install postgresql
        ```
    -   **Windows**:
        PostgreSQLの公式インストーラーをダウンロードし、インストール時に「Command Line Tools」を選択してください。または、Chocolateyを使用できます。
        ```bash
        choco install postgresql-client
        ```

2.  **バックアップファイルの準備**: ダウンロードしたZIPファイルを解凍し、3つのSQLファイルをローカルに配置します。
3.  **データベース接続情報の準備**:
    作業対象の環境（ステージングまたは本番）に応じて、データベース接続URLを環境変数として設定します。この手順により、`psql`コマンド実行時にURLを毎回入力する手間を省き、誤った環境への接続を防ぎます。

    a. **設定ファイルの作成**
    プロジェクトのルートディレクトリに、以下の2つのファイルを作成します。
    - `.env.staging`
    - `.env.production`

    b. **接続URLの記述**
    Supabaseのプロジェクト管理画面にアクセスし、それぞれの環境のデータベース接続文字列（`psql`用の`URI`）をコピーします。そして、作成したファイルに以下のように貼り付けます。

    - `.env.staging`ファイルの中身:
      ```
      export DATABASE_URL="postgres://postgres:[YOUR-PASSWORD]@db.<...>.supabase.co:5432/postgres"
      ```
    - `.env.production`ファイルの中身:
      ```
      export DATABASE_URL="postgres://postgres:[YOUR-PASSWORD]@db.<...>.supabase.co:5432/postgres"
      ```
    *これらのファイルは`.gitignore`によりGitの管理対象外となっているため、パスワードなどの機密情報がリポジトリに登録されることはありません。*

    c. **環境変数の読み込み**
    データベースを操作するターミナルで、作業したい環境のファイルを`source`コマンドで読み込みます。

    - **ステージング環境**に接続する場合:
      ```bash
      source .env.staging
      ```
    - **本番環境**に接続する場合:
      ```bash
      source .env.production
      ```

    実行後、`echo $DATABASE_URL`コマンドでURLが正しく設定されたか確認できます。これで、現在のターミナルセッション内で`$DATABASE_URL`が有効になります。
4.  **データベースの初期化（推奨）**:
    復元先のデータベースに既存のデータやスキーマが残っていると、リストア時にコンフリクトが発生する可能性があります。以下のコマンドで`public`スキーマを一度削除し、再作成することをお勧めします。

    ```bash
    psql "$DATABASE_URL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
    ```

5.  **`psql`コマンドでの復元**: 以下のコマンドを順番に実行します。`$DATABASE_URL`は実際の接続文字列に、`YYYYMMDD_HHMMSS`はバックアップファイルのタイムスタンプに置き換えてください。

    ```bash
    # 1. ロールの復元
    # 既存のSupabaseプロジェクトに復元する場合、ロールの競合に注意してください。
    # 必要に応じて、このステップをスキップするか、内容を確認して調整してください。
    psql "$DATABASE_URL" -f backup-roles-YYYYMMDD_HHMMSS.sql

    # 2. スキーマの復元
    psql "$DATABASE_URL" -f backup-schema-YYYYMMSS_HHMMSS.sql

    # 3. データの復元
    psql "$DATABASE_URL" -f backup-data-YYYYMMSS_HHMMSS.sql
    ```