package kr.co.acscent.kiosk;

import android.app.admin.DeviceAdminReceiver;

/**
 * 기기 관리자(device owner) — install.sh 가 한 번 정한다(adb shell dpm set-device-owner kr.co.acscent.kiosk/.AdminReceiver).
 * 이게 되면: 앱 업데이트가 묻지 않고 깔리고, 키오스크 잠금(상태 표시줄 · 홈 · 최근 앱 막기)이 걸린다.
 * 풀기: 관리 메뉴(왼쪽 위 7번 · PIN) → '키오스크 잠금 · 기기 관리자 해제'
 */
public class AdminReceiver extends DeviceAdminReceiver {
}
