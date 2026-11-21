package kr.co.acscent.kiosk;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.util.Log;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * 앱 자동 업데이트 — 우리 사이트의 latest.json(tools/kiosk-android/publish.sh 가 public/kiosk-android 에 올린다)을 보고
 * 지금보다 새 버전이면 APK 를 받아 SHA-256 을 맞춰 본 뒤 PackageInstaller 로 깐다.
 *  - 기기 관리자(device owner)면 묻지 않고 깔린다. 아니면 안드로이드 설치 확인 창이 뜬다(직원이 한 번 누름).
 *  - 같은 배포 키로 서명한 APK 만 깔린다(안드로이드가 확인) — 사이트의 파일이 바뀌어도 다른 앱으로 바뀌지 않는다.
 * 네트워크 · 파일 작업은 부르는 쪽이 백그라운드 스레드에서 부른다.
 */
final class Updater {
    static final String TAG = "AcscentKiosk";

    static final class Release {
        int versionCode;
        String versionName;
        String url;
        String sha256;
    }

    /** latest.json 을 읽는다 — 못 읽으면 null */
    static Release fetch(String jsonUrl) {
        try {
            byte[] body = get(jsonUrl + (jsonUrl.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis(), 64 * 1024);
            if (body == null) return null;
            JSONObject o = new JSONObject(new String(body, "UTF-8"));
            Release r = new Release();
            r.versionCode = o.getInt("versionCode");
            r.versionName = o.optString("versionName", "");
            r.url = new URL(new URL(jsonUrl), o.getString("url")).toString();
            r.sha256 = o.getString("sha256").toLowerCase();
            return r;
        } catch (Exception e) {
            Log.w(TAG, "update check failed: " + e);
            return null;
        }
    }

    /** APK 를 받아 해시를 맞춰 보고 설치를 맡긴다. 결과는 UpdateResultReceiver 로 온다 */
    static boolean install(Context context, Release r) {
        File apk = new File(context.getCacheDir(), "update.apk");
        try {
            byte[] data = get(r.url, 200 * 1024 * 1024);
            if (data == null) return false;
            String hash = sha256(data);
            if (!hash.equals(r.sha256)) {
                Log.e(TAG, "update hash mismatch " + hash + " != " + r.sha256);
                return false;
            }
            try (OutputStream out = new FileOutputStream(apk)) { out.write(data); }

            PackageInstaller installer = context.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            params.setAppPackageName(context.getPackageName());
            int sessionId = installer.createSession(params);
            try (PackageInstaller.Session session = installer.openSession(sessionId)) {
                try (OutputStream out = session.openWrite("acscent-kiosk.apk", 0, apk.length());
                     InputStream in = new FileInputStream(apk)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    session.fsync(out);
                }
                Intent done = new Intent(context, UpdateResultReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(context, sessionId, done, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
                Log.i(TAG, "installing update " + r.versionName + " (" + r.versionCode + ")");
                session.commit(pi.getIntentSender());
            }
            return true;
        } catch (Exception e) {
            Log.e(TAG, "update install failed: " + e);
            return false;
        } finally {
            // 설치기는 세션에 복사본을 가진다 — 받은 파일은 지운다
            apk.delete();
        }
    }

    private static byte[] get(String url, int max) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(15_000);
            c.setReadTimeout(60_000);
            c.setRequestProperty("Cache-Control", "no-cache");
            if (c.getResponseCode() != 200) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (InputStream in = c.getInputStream()) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    if (out.size() > max) return null;
                }
            }
            return out.toByteArray();
        } finally {
            c.disconnect();
        }
    }

    private static String sha256(byte[] data) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : d) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private Updater() {}
}
