package kr.co.acscent.kiosk;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** 전원을 켜면 키오스크 화면을 띄운다(홈 앱으로 지정하지 않았을 때의 대비) */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Intent start = new Intent(context, MainActivity.class);
        start.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(start);
    }
}
