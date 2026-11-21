package kr.co.acscent.kiosk;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.util.Log;

/** 업데이트 설치 결과 — 기기 관리자가 아니면 안드로이드 설치 확인 창을 띄운다(직원이 한 번 누름) */
public class UpdateResultReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        String message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(confirm);
            }
            Log.i(Updater.TAG, "update needs confirmation (not device owner)");
        } else if (status == PackageInstaller.STATUS_SUCCESS) {
            Log.i(Updater.TAG, "update installed");
        } else {
            Log.e(Updater.TAG, "update failed: " + status + " " + message);
        }
    }
}
