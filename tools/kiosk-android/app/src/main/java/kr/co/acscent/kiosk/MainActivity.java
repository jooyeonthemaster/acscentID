package kr.co.acscent.kiosk;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.InputType;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AC'SCENT 키오스크 — 안드로이드 기기(SUNMI TOSS_Front 등, 프린터 없음)용 전체 화면 웹뷰 셸.
 *
 * 화면은 우리 사이트의 /kiosk 를 그대로 띄운다. 이 앱이 하는 일:
 *  - 전체 화면 · 화면 꺼짐 막기 · 뒤로 가기 막기 · 다른 사이트로 나가지 않기
 *  - 카메라 · 마이크 권한을 묻지 않고 허용(우리 주소만), 영상 · 소리를 터치 없이 재생
 *  - 웹에 window.AcscentAndroid 를 건다 — 웹(src/lib/kiosk/kiosk-bridge.ts)이 이걸 보고
 *    "프린터 없는 매장 키오스크"로 돈다: 결과(영수증)는 인쇄 대신 휴대폰 QR 로 받는다.
 *  - 인터넷이 끊기면 안내 화면을 띄우고 15초마다 다시 연결한다. 웹뷰가 죽으면 새로 만든다.
 *  - 새 배포가 올라오면(10분마다 확인) 5분 동안 터치가 없을 때 새로고침해 최신 화면으로.
 *  - 왼쪽 위 모서리를 4초 안에 7번 누르면 관리 메뉴(PIN) — 주소 바꾸기 · 새로고침 · 안드로이드 설정.
 *
 * adb 로 설정(값은 기기에 저장된다):
 *   adb shell am start -n kr.co.acscent.kiosk/.MainActivity --es url https://www.acscent.co.kr/kiosk --es mode ai-perfumer-harin
 *   --es pin 1357 · --ez reset true(설정 지우기) · --ez clearCache true(캐시 · 저장소 지우기)
 */
public class MainActivity extends Activity {
    static final String TAG = "AcscentKiosk";
    static final String PREFS = "kiosk";
    static final String DEFAULT_URL = "https://www.acscent.co.kr/kiosk";
    /** 웹의 기기 모드(관리자 창에서 고른 값)가 없을 때 돌릴 운영 모드 — SCENT! 하린 루트 */
    static final String DEFAULT_MODE = "ai-perfumer-harin";
    static final String DEFAULT_PIN = "110619";
    static final int REQ_PERMS = 41;
    static final long RETRY_MS = 15_000;
    /** 화면 설계 크기 — 매장 키오스크(Electron 셸)가 1080×1920 을 CSS 560×996 으로 그린다. 모든 프로그램이 이 크기로 짜여 있다.
     *  기기 화면에 이 크기가 잘림 없이 다 들어가게(contain) 배율을 정한다 — 800×1280 이면 CSS 622×996(남는 폭은 각 화면 바탕 · 영상이 채운다) */
    static final int DESIGN_W = 560;
    static final int DESIGN_H = 996;
    /** 새 배포 확인 — 10분마다 시작 주소의 배포 번호(Vercel dpl_…)를 보고, 바뀌었으면 손님이 없을 때(5분 동안 터치 없음) 새로고침 */
    static final long UPDATE_CHECK_MS = 10 * 60_000;
    static final long UPDATE_RECHECK_MS = 60_000;
    static final long IDLE_FOR_RELOAD_MS = 5 * 60_000;
    static final Pattern DEPLOY = Pattern.compile("dpl=(dpl_[A-Za-z0-9]+)");

    private FrameLayout root;
    private WebView web;
    private SharedPreferences prefs;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private boolean offline = false;
    private PermissionRequest pendingPermission;
    private int cornerTaps = 0;
    private long cornerFirstTap = 0;
    private AlertDialog dialog;
    private volatile long lastTouch = System.currentTimeMillis();
    /** 지금 화면을 그린 배포 번호(페이지가 다 뜨면 읽는다) · 서버에 새로 올라온 배포 번호 */
    private volatile String loadedDeploy = "";
    private volatile String serverDeploy = "";

    private final Runnable updateCheck = new Runnable() {
        @Override public void run() {
            ui.removeCallbacks(this);
            boolean pending = !loadedDeploy.isEmpty() && !serverDeploy.isEmpty() && !serverDeploy.equals(loadedDeploy);
            if (pending && !offline && System.currentTimeMillis() - lastTouch >= IDLE_FOR_RELOAD_MS) {
                Log.i(TAG, "new deploy " + loadedDeploy + " -> " + serverDeploy + ", reloading");
                loadedDeploy = "";
                web.loadUrl(startUrl());
                ui.postDelayed(this, UPDATE_CHECK_MS);
                return;
            }
            if (pending) { ui.postDelayed(this, UPDATE_RECHECK_MS); return; }
            final String url = startUrl();
            new Thread(() -> {
                String found = fetchDeploy(url);
                if (found != null) serverDeploy = found;
                ui.post(() -> ui.postDelayed(updateCheck, serverDeploy.equals(loadedDeploy) || loadedDeploy.isEmpty() ? UPDATE_CHECK_MS : 1000));
            }, "deploy-check").start();
        }
    };

    private final Runnable retry = new Runnable() {
        @Override public void run() {
            if (offline && web != null) {
                Log.i(TAG, "retry " + startUrl());
                offline = false;
                web.loadUrl(startUrl());
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setShowWhenLocked(true);
        setTurnScreenOn(true);

        applyExtras(getIntent());
        WebView.setWebContentsDebuggingEnabled(true);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        setContentView(root);
        createWebView();
        askPermissions();
        web.loadUrl(startUrl());
        ui.postDelayed(updateCheck, UPDATE_CHECK_MS);
    }

    /** 시작 주소 HTML 에서 배포 번호를 찾는다 — 못 찾으면(개발 서버 · 연결 끊김) null */
    private static String fetchDeploy(String url) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(10_000);
            c.setReadTimeout(15_000);
            c.setRequestProperty("Cache-Control", "no-cache");
            if (c.getResponseCode() != 200) return null;
            InputStream in = c.getInputStream();
            byte[] buf = new byte[64 * 1024];
            StringBuilder sb = new StringBuilder();
            int n;
            while (sb.length() < 400_000 && (n = in.read(buf)) > 0) {
                sb.append(new String(buf, 0, n, "UTF-8"));
                Matcher m = DEPLOY.matcher(sb);
                if (m.find()) return m.group(1);
            }
            return null;
        } catch (Exception e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String before = startUrl();
        boolean changed = applyExtras(intent);
        if (changed || !before.equals(startUrl())) {
            offline = false;
            web.loadUrl(startUrl());
        }
        // adb 로 관리 메뉴 PIN 창 열기(--ez admin true) — 화면을 못 누르는 원격 점검용
        if (intent.getBooleanExtra("admin", false)) askPin();
    }

    /** adb 로 넘긴 설정을 저장한다 — 바뀐 게 있으면 true */
    private boolean applyExtras(Intent intent) {
        if (intent == null || intent.getExtras() == null) return false;
        SharedPreferences.Editor e = prefs.edit();
        boolean changed = false;
        if (intent.getBooleanExtra("reset", false)) { e.clear(); changed = true; }
        String url = intent.getStringExtra("url");
        if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) { e.putString("url", url); changed = true; }
        String mode = intent.getStringExtra("mode");
        if (mode != null) { e.putString("mode", mode); changed = true; }
        int cssWidth = intent.getIntExtra("cssWidth", 0);
        if (cssWidth == -1 || (cssWidth >= 320 && cssWidth <= 2000)) { e.putInt("cssWidth", Math.max(0, cssWidth)); changed = true; }
        String pin = intent.getStringExtra("pin");
        if (pin != null && pin.length() >= 4) { e.putString("pin", pin); changed = true; }
        e.apply();
        if (intent.getBooleanExtra("clearCache", false)) {
            clearWebData();
            changed = true;
        }
        return changed;
    }

    String startUrl() { return prefs.getString("url", DEFAULT_URL); }
    String defaultMode() { return prefs.getString("mode", DEFAULT_MODE); }
    String pin() { return prefs.getString("pin", DEFAULT_PIN); }

    private void clearWebData() {
        if (web != null) web.clearCache(true);
        WebStorage.getInstance().deleteAllData();
        CookieManager.getInstance().removeAllCookies(null);
    }

    // ── 웹뷰 ──────────────────────────────────────────────

    private void createWebView() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
        }
        web = new WebView(this);
        web.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setBackgroundColor(Color.BLACK);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setHapticFeedbackEnabled(false);
        // 길게 눌러 글자 선택 · 메뉴가 뜨지 않게
        web.setLongClickable(false);
        web.setOnLongClickListener(v -> true);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // 화면 폭을 CSS 560 으로 고정한다 — 페이지의 viewport(device-width)를 쓰지 않고, 물리 폭 ÷ 560 배율로 그린다
        s.setUseWideViewPort(false);
        s.setLoadWithOverviewMode(false);
        applyScale();
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " AcscentKioskAndroid/" + BuildConfig.VERSION_NAME);

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.addJavascriptInterface(new Bridge(), "AcscentAndroid");
        web.setWebViewClient(new KioskClient());
        web.setWebChromeClient(new KioskChrome());
        root.addView(web, 0);
    }

    /** 배율 — 설계 크기(560×996)가 화면에 다 들어가게. adb 로 cssWidth 를 정했으면 그 폭으로 고정 */
    private void applyScale() {
        android.util.DisplayMetrics m = new android.util.DisplayMetrics();
        getWindowManager().getDefaultDisplay().getRealMetrics(m);
        int w = m.widthPixels, h = m.heightPixels;
        int cssWidth = prefs.getInt("cssWidth", 0);
        float scale = cssWidth > 0 ? w / (float) cssWidth : Math.min(w / (float) DESIGN_W, h / (float) DESIGN_H);
        int percent = Math.max(10, Math.round(scale * 100f));
        web.setInitialScale(percent);
        Log.i(TAG, "scale " + percent + "% (" + w + "×" + h + "px → css " + Math.round(w / scale) + "×" + Math.round(h / scale) + ")");
    }

    /** 이 앱 안에서 열어도 되는 주소 — 우리 사이트 · 개발 서버(localhost) · 설정한 시작 주소의 호스트 */
    boolean allowed(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        if ("about".equals(scheme) || "data".equals(scheme) || "blob".equals(scheme)) return true;
        if ("file".equals(scheme)) return uri.toString().startsWith("file:///android_asset/");
        if (!"http".equals(scheme) && !"https".equals(scheme)) return false;
        String host = uri.getHost();
        if (host == null) return false;
        if (host.equals("acscent.co.kr") || host.endsWith(".acscent.co.kr")) return true;
        if (host.equals("localhost") || host.equals("127.0.0.1")) return true;
        String start = Uri.parse(startUrl()).getHost();
        return host.equals(start);
    }

    boolean allowedOrigin(Uri origin) {
        return origin != null && allowed(origin) && !"file".equals(origin.getScheme());
    }

    private void showOffline(String why) {
        if (offline) return;
        offline = true;
        Log.w(TAG, "offline: " + why);
        web.loadUrl("file:///android_asset/offline.html");
        ui.removeCallbacks(retry);
        ui.postDelayed(retry, RETRY_MS);
    }

    private class KioskClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (allowed(uri)) return false;
            Log.w(TAG, "blocked navigation: " + uri);
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (url == null || !url.startsWith("http")) return;
            // 이 화면을 그린 배포 번호 — 스크립트 주소의 ?dpl= (Vercel). 없으면(개발 서버) 새 배포 확인을 하지 않는다
            view.evaluateJavascript("(document.documentElement.innerHTML.match(/dpl=(dpl_[A-Za-z0-9]+)/)||[])[1]||''", v -> {
                String id = v == null ? "" : v.replace("\"", "");
                loadedDeploy = id;
                if (!id.isEmpty()) Log.i(TAG, "deploy " + id);
            });
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame() && !request.getUrl().toString().startsWith("file:")) {
                showOffline(error.getErrorCode() + " " + error.getDescription());
            }
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            // 서버가 잠깐 5xx 를 내면(배포 중 등) 빈 화면 대신 안내 화면 → 다시 연결
            if (request.isForMainFrame() && response.getStatusCode() >= 500) {
                showOffline("http " + response.getStatusCode());
            }
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // 렌더러가 죽으면(메모리 부족 등) 웹뷰를 새로 만들어 처음부터 — 앱이 같이 죽지 않게 true
            Log.e(TAG, "renderer gone, crashed=" + detail.didCrash());
            ui.post(() -> {
                offline = false;
                createWebView();
                web.loadUrl(startUrl());
            });
            return true;
        }
    }

    private class KioskChrome extends WebChromeClient {
        @Override
        public void onPermissionRequest(PermissionRequest request) {
            ui.post(() -> {
                if (!allowedOrigin(request.getOrigin())) {
                    request.deny();
                    return;
                }
                if (needsAndroidPermission(request)) {
                    // 안드로이드 권한부터 받고 나서 허용한다(onRequestPermissionsResult)
                    if (pendingPermission != null) pendingPermission.deny();
                    pendingPermission = request;
                    askPermissions();
                    return;
                }
                grant(request);
            });
        }

        @Override
        public Bitmap getDefaultVideoPoster() {
            // 영상이 뜨기 전 회색 재생 단추 그림 대신 투명 — 장면 사이 깜빡임 방지
            return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
        }

        @Override
        public boolean onConsoleMessage(ConsoleMessage m) {
            Log.i(TAG, "console " + m.messageLevel() + " " + m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
            return true;
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
            // 무인 기기 — 파일 탐색기를 열지 않는다
            callback.onReceiveValue(null);
            return true;
        }
    }

    private boolean has(String perm) {
        return checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean needsAndroidPermission(PermissionRequest request) {
        for (String r : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && !has(Manifest.permission.CAMERA)) return true;
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && !has(Manifest.permission.RECORD_AUDIO)) return true;
        }
        return false;
    }

    private void grant(PermissionRequest request) {
        List<String> ok = new ArrayList<>();
        for (String r : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && has(Manifest.permission.CAMERA)) ok.add(r);
            else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && has(Manifest.permission.RECORD_AUDIO)) ok.add(r);
            else if (PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID.equals(r)) ok.add(r);
        }
        if (ok.isEmpty()) request.deny();
        else request.grant(ok.toArray(new String[0]));
    }

    private void askPermissions() {
        List<String> need = new ArrayList<>();
        if (!has(Manifest.permission.CAMERA)) need.add(Manifest.permission.CAMERA);
        if (!has(Manifest.permission.RECORD_AUDIO)) need.add(Manifest.permission.RECORD_AUDIO);
        if (!need.isEmpty()) requestPermissions(need.toArray(new String[0]), REQ_PERMS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQ_PERMS && pendingPermission != null) {
            PermissionRequest r = pendingPermission;
            pendingPermission = null;
            grant(r);
        }
        hideSystemUi();
    }

    // ── 웹 ↔ 앱 ───────────────────────────────────────────

    /** 웹에서 window.AcscentAndroid 로 부른다 — 계약은 src/lib/kiosk/kiosk-bridge.ts androidBridge() */
    private class Bridge {
        @JavascriptInterface
        public String info() {
            try {
                JSONObject o = new JSONObject();
                o.put("version", BuildConfig.VERSION_NAME);
                o.put("versionCode", BuildConfig.VERSION_CODE);
                o.put("hasPrinter", false);
                o.put("defaultMode", defaultMode());
                o.put("model", Build.MODEL);
                o.put("manufacturer", Build.MANUFACTURER);
                o.put("android", Build.VERSION.RELEASE);
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        /** 발권 번호 — 그날 0001 부터. 직원이 손님 휴대폰(QR 결과)의 번호를 보고 조향한다 */
        @JavascriptInterface
        public synchronized String nextTicket() {
            String today = new SimpleDateFormat("yyyyMMdd", Locale.KOREA).format(new Date());
            int n = today.equals(prefs.getString("ticketDay", "")) ? prefs.getInt("ticketNo", 0) + 1 : 1;
            prefs.edit().putString("ticketDay", today).putInt("ticketNo", n).apply();
            return String.format(Locale.ROOT, "%04d", n);
        }

        /** 웹 관리자 창의 '앱 종료' — 관리 메뉴를 연다(웹에서 이미 PIN 을 확인했다) */
        @JavascriptInterface
        public void quitApp() {
            ui.post(() -> showAdminMenu());
        }

        @JavascriptInterface
        public boolean checkAdminPin(String value) {
            return value != null && value.equals(pin());
        }

        @JavascriptInterface
        public void reload() {
            ui.post(() -> { offline = false; web.loadUrl(startUrl()); });
        }
    }

    // ── 관리 메뉴(왼쪽 위 모서리 7번) ─────────────────────

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        lastTouch = System.currentTimeMillis();
        if (ev.getActionMasked() == MotionEvent.ACTION_DOWN) {
            float edge = 110 * getResources().getDisplayMetrics().density / 1.75f;
            // 왼쪽 위 — 오른쪽 위는 웹 관리자 창 핫스팟이라 겹치지 않게
            if (ev.getX() < edge && ev.getY() < edge) {
                long now = System.currentTimeMillis();
                if (now - cornerFirstTap > 4000) { cornerFirstTap = now; cornerTaps = 0; }
                if (++cornerTaps >= 7) {
                    cornerTaps = 0;
                    askPin();
                }
            }
        }
        return super.dispatchTouchEvent(ev);
    }

    private void askPin() {
        if (dialog != null && dialog.isShowing()) return;
        EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD);
        input.setHint("PIN");
        dialog = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("키오스크 관리")
                .setView(input)
                .setPositiveButton("확인", (d, w) -> {
                    if (pin().equals(input.getText().toString())) showAdminMenu();
                    else Toast.makeText(this, "PIN 이 맞지 않습니다", Toast.LENGTH_SHORT).show();
                })
                .setNegativeButton("닫기", null)
                .create();
        dialog.setOnDismissListener(d -> hideSystemUi());
        dialog.show();
    }

    private void showAdminMenu() {
        if (dialog != null && dialog.isShowing()) dialog.dismiss();
        String[] items = {
                "새로고침",
                "주소 바꾸기 (지금: " + startUrl() + ")",
                "캐시 · 저장소 지우고 새로고침",
                "안드로이드 설정 열기",
                "키오스크 앱 닫기",
        };
        dialog = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("키오스크 관리 · v" + BuildConfig.VERSION_NAME)
                .setItems(items, (d, which) -> {
                    switch (which) {
                        case 0: offline = false; web.loadUrl(startUrl()); break;
                        case 1: askUrl(); break;
                        case 2: clearWebData(); offline = false; web.loadUrl(startUrl()); break;
                        case 3: startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); break;
                        case 4: finishAndRemoveTask(); break;
                    }
                })
                .setNegativeButton("닫기", null)
                .create();
        dialog.setOnDismissListener(d -> hideSystemUi());
        dialog.show();
    }

    private void askUrl() {
        EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        input.setText(startUrl());
        dialog = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("시작 주소")
                .setView(input)
                .setPositiveButton("저장", (d, w) -> {
                    String url = input.getText().toString().trim();
                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        prefs.edit().putString("url", url).apply();
                        offline = false;
                        web.loadUrl(url);
                    }
                })
                .setNeutralButton("기본값", (d, w) -> {
                    prefs.edit().remove("url").apply();
                    offline = false;
                    web.loadUrl(startUrl());
                })
                .setNegativeButton("닫기", null)
                .create();
        dialog.setOnDismissListener(d -> hideSystemUi());
        dialog.show();
    }

    // ── 전체 화면 ─────────────────────────────────────────

    @SuppressWarnings("deprecation")
    private void hideSystemUi() {
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUi();
        if (web != null) web.onResume();
    }

    @Override
    protected void onPause() {
        // 웹뷰를 멈추지 않는다 — 관리 창이 떠도 화면(영상)은 계속
        super.onPause();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        // 무인 기기 — 뒤로 가기로 앱을 나가지 않는다
    }

    @Override
    protected void onDestroy() {
        ui.removeCallbacksAndMessages(null);
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
