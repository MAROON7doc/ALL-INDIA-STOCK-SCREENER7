"""
Technical Pattern Recognition Module for Indian Equities (NSE/BSE)
Implements:
1. Cup with Handle Pattern Recognition (CANSLIM)
2. 7-Week Tight Consolidation Base Detection
3. Volume Burst Calculation vs 20-Day SMA
4. Relative Strength (RS) Mansfield Score vs NIFTY 50
"""

import numpy as np
import pandas as pd

def detect_cup_with_handle(df, lookback=90):
    """
    Detects classic William O'Neil Cup with Handle pattern on daily OHLCV DataFrame.
    DataFrame must contain: ['Open', 'High', 'Low', 'Close', 'Volume']
    """
    if len(df) < 50:
        return {'is_pattern': False, 'score': 0, 'stage': 'Insufficient Data'}
    
    window = df.iloc[-min(lookback, len(df)):].copy().reset_index(drop=True)
    highs = window['High'].values
    lows = window['Low'].values
    closes = window['Close'].values
    n = len(window)
    
    # 1. Left Rim Peak (in first 45% of window)
    first_part = int(n * 0.45)
    left_peak_idx = -1
    left_peak_price = -1
    for i in range(5, first_part):
        if highs[i] > left_peak_price and highs[i] >= highs[i-1] and highs[i] >= highs[i+1]:
            left_peak_price = highs[i]
            left_peak_idx = i
            
    if left_peak_idx == -1:
        return {'is_pattern': False, 'score': 0, 'stage': 'No Left Rim'}
        
    # 2. Cup Bottom (after left rim, before recent 15 bars)
    search_end = n - 12
    cup_bottom_idx = -1
    cup_bottom_price = float('inf')
    for i in range(left_peak_idx + 4, search_end):
        if lows[i] < cup_bottom_price:
            cup_bottom_price = lows[i]
            cup_bottom_idx = i
            
    if cup_bottom_idx == -1:
        return {'is_pattern': False, 'score': 0, 'stage': 'No Cup Bottom'}
        
    cup_depth_pct = ((left_peak_price - cup_bottom_price) / left_peak_price) * 100
    if cup_depth_pct < 10 or cup_depth_pct > 45:
        return {'is_pattern': False, 'score': 0, 'stage': 'Invalid Cup Depth', 'cup_depth_pct': cup_depth_pct}
        
    # 3. Right Rim Peak (after bottom)
    right_peak_idx = -1
    right_peak_price = -1
    for i in range(cup_bottom_idx + 4, n - 2):
        if highs[i] > right_peak_price:
            right_peak_price = highs[i]
            right_peak_idx = i
            
    if right_peak_idx == -1:
        return {'is_pattern': False, 'score': 0, 'stage': 'No Right Rim'}
        
    peak_diff_pct = abs(left_peak_price - right_peak_price) / left_peak_price * 100
    if peak_diff_pct > 10:
        return {'is_pattern': False, 'score': 0, 'stage': 'Asymmetric Peaks', 'peak_diff_pct': peak_diff_pct}
        
    # 4. Handle Analysis
    handle_low = min(lows[right_peak_idx:])
    handle_depth_pct = ((right_peak_price - handle_low) / right_peak_price) * 100
    if handle_depth_pct > cup_depth_pct * 0.65 or handle_depth_pct > 18:
        return {'is_pattern': False, 'score': 0, 'stage': 'Handle Too Deep'}
        
    current_close = closes[-1]
    pivot_price = round(right_peak_price, 2)
    target_price = round(pivot_price + (left_peak_price - cup_bottom_price), 2)
    stop_loss_price = round(min(handle_low * 0.99, pivot_price * 0.93), 2)
    sl_pct = round(((current_close - stop_loss_price) / current_close) * 100, 2)
    dist_to_pivot_pct = round(((current_close - pivot_price) / pivot_price) * 100, 2)
    
    stage = 'Forming Handle'
    if current_close >= pivot_price * 0.99 and current_close <= pivot_price * 1.05:
        stage = 'At Pivot Breakout'
    elif current_close > pivot_price * 1.05:
        stage = 'Extended'
        
    return {
        'is_pattern': True,
        'score': 85,
        'stage': stage,
        'pivot_price': pivot_price,
        'target_price': target_price,
        'stop_loss_price': stop_loss_price,
        'sl_pct': sl_pct,
        'dist_to_pivot_pct': dist_to_pivot_pct,
        'cup_depth_pct': round(cup_depth_pct, 2),
        'handle_depth_pct': round(handle_depth_pct, 2)
    }

def detect_7week_consolidation(df, weeks=7, max_range_pct=15.0):
    """
    Identifies 7-week tight consolidation base (~35 trading days)
    """
    sessions = weeks * 5
    if len(df) < sessions:
        return {'is_consolidating': False, 'range_pct': 0}
        
    base = df.iloc[-sessions:]
    high = base['High'].max()
    low = base['Low'].min()
    current_close = df['Close'].iloc[-1]
    
    range_pct = ((high - low) / low) * 100
    is_near_top = current_close >= high * 0.94
    is_consolidating = (range_pct <= max_range_pct) and (range_pct >= 3.0) and is_near_top
    
    return {
        'is_consolidating': bool(is_consolidating),
        'range_pct': round(range_pct, 2),
        'base_high': round(high, 2),
        'base_low': round(low, 2),
        'days': sessions
    }
