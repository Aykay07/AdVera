import argparse
import hashlib
import random
import time
import uuid
import requests

BACKEND_URL = "http://localhost:4000"

def fake_ip_hash() -> str:
    raw_ip = f"{random.randint(1,255)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}"
    return hashlib.sha256(raw_ip.encode()).hexdigest()

def send_event(path, ad_id, campaign_id, ip_hash):
    try:
        requests.post(
            f"{BACKEND_URL}/track/{path}",
            json={"adId": ad_id, "campaignId": campaign_id, "ipHash": ip_hash,
"timestamp": int(time.time() * 1000)},
            timeout=2,
        )
    except requests.RequestException as exc:
        print(f"  ! failed to post to {path}: {exc}")

def run_normal_flow(campaign_id, events):
    print(f"[normal] generating {events} matched impressions for campaign {campaign_id}")
    mismatches = max(1, int(events * 0.01))
    for i in range(events):
        ad_id = str(uuid.uuid4())
        ip_hash = fake_ip_hash()
        send_event("advertiser-side", ad_id, campaign_id, ip_hash)
        if i >= mismatches:
            send_event("publisher-side", ad_id, campaign_id, ip_hash)
    print("[normal] done")

def run_fraud_flow(campaign_id, events, bots):
    print(f"[fraud] generating {events} matched + {bots} bot-only impressions for campaign {campaign_id}")
    for _ in range(events):
        ad_id = str(uuid.uuid4())
        ip_hash = fake_ip_hash()
        send_event("advertiser-side", ad_id, campaign_id, ip_hash)
        send_event("publisher-side", ad_id, campaign_id, ip_hash)
    bot_ip_pool = [fake_ip_hash() for _ in range(5)]
    for _ in range(bots):
        ad_id = str(uuid.uuid4())
        ip_hash = random.choice(bot_ip_pool)
        send_event("publisher-side", ad_id, campaign_id, ip_hash)
    print("[fraud] done")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--campaign", required=True)
    parser.add_argument("--mode", choices=["normal", "fraud"], default="normal")
    parser.add_argument("--events", type=int, default=500)
    parser.add_argument("--bots", type=int, default=2000)
    args = parser.parse_args()

    if args.mode == "normal":
        run_normal_flow(args.campaign, args.events)
    else:
        run_fraud_flow(args.campaign, args.events, args.bots)
