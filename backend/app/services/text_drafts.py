"""Auto-draft Burmese narrative for slide 21 (Power Source Priority), built
from the values the user already entered. The user can edit this draft before
export; if they leave the field blank the template's original text is kept."""
from __future__ import annotations


def compose_power_priority_draft(values: dict) -> str:
    def g(k, default=""):
        v = values.get(k)
        return default if v is None or v == "" else v

    solar_start = g("solar_start_time", "09:00")
    solar_end = g("solar_end_time", "16:00")
    solar_load = g("solar_load_kw", g("avg_load_kw", ""))
    battery_kwh = g("total_battery_kwh", "")
    autonomy = g("battery_autonomy_hours", "")
    epc_start = g("epc_start_time", "23:00")
    epc_end = g("epc_end_time", "05:00")
    dod = g("generator_dod_trigger_pct", 20)
    precharge = values.get("epc_precharge", True)

    precharge_clause = (
        " တစ်ပြိုင်နက်တည်းတွင် ဘက်ထရီကိုပါ ကြိုတင်အားသွင်း (Pre-charge) မည်။"
        if precharge
        else "။"
    )

    lines = [
        f"(Solar PV): နေ့ခင်းဘက် ({solar_start}–{solar_end}) တွင် Load {solar_load}kW ကို "
        f"ဆိုလာမှ တိုက်ရိုက်မောင်းနှင်ပြီး၊ ပိုလျှံသော ဆိုလာဓာတ်အားကို ဘက်ထရီ {battery_kwh} kWh "
        f"ထဲသို့ အခမဲ့ အားသွင်းမည်။",
        "",
        f"(Battery ESS): ဆိုလာဓာတ်အား မရရှိနိုင်တော့သောအချိန်တွင် ဘက်ထရီမှ ဓာတ်အား "
        f"ထုတ်လွှတ်ပြီး လုပ်ငန်းကို ~{autonomy} နာရီ ဆက်လက် မပြတ်တောက်ဘဲ မောင်းနှင်နိုင်သည်။",
        "",
        f"(EPC / အစိုးရမီးလိုင်း): {epc_start}–{epc_end} အတွင်း EPC မီးလိုင်းလာချိန်တွင် "
        f"လုပ်ငန်းဝန်အားကို EPC ဖြင့် ပြောင်းလဲမောင်းနှင်ပြီး၊{precharge_clause}",
        "",
        f"(Generator): ဘက်ထရီစွမ်းအင် {dod}% (DoD Limit) သို့ ရောက်ရှိသွားချိန်တွင် "
        f"အရန်မီးစက်ကို အလိုအလျောက် နှိုး၍ မောင်းနှင်မည်။",
    ]
    return "\n".join(lines)
