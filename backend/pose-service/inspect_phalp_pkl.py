#!/usr/bin/env python3
import pickle
import json

pkl_path = '/home/ben/pose-service/PHALP/assets/videos/gt_tracks.pkl'

with open(pkl_path, 'rb') as f:
    data = pickle.load(f)

print(f"Type: {type(data)}")
print(f"Keys: {list(data.keys())[:5]}")

first_key = list(data.keys())[0]
first_val = data[first_key]

print(f"\nFirst key: {first_key}")
print(f"First value type: {type(first_val)}")

if isinstance(first_val, dict):
    print(f"First value keys: {list(first_val.keys())}")
    for k, v in list(first_val.items())[:5]:
        if isinstance(v, list):
            print(f"  {k}: list of {len(v)} items")
            if len(v) > 0:
                print(f"    First item type: {type(v[0])}")
        else:
            print(f"  {k}: {type(v).__name__}")
