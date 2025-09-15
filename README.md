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
        A[ユーザーブラウザ]
    end

    subgraph "インフラストラクチャ (Render)"
        B[Frontend (React + Nginx)]
        C[Backend (Node.js + Express)]
    end

    subgraph "データベース (Supabase)"
        D[PostgreSQL データベース]
    end

    A -- HTTPS --> B
    B -- APIリクエスト --> C
    C -- DBアクセス --> D
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

-   **SupabaseプロジェクトのKeep-Alive**:
    -   GitHub Actionsを利用し、開発・ステージング環境のSupabaseプロジェクトが非アクティブにより休止されるのを防ぎます。
    -   毎週日曜日の午前3時(UTC)に自動でSupabaseデータベースにアクセスし、プロジェクトをアクティブに保ちます。