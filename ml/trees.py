"""Run the trained LightGBM forecaster with numpy only.

    python -m ml.trees          # export models/forecaster.joblib -> models/forecaster_trees.npz and check it

Why: the hosted demo (Vercel) can't rely on LightGBM's native library being loadable, and LightGBM +
scikit-learn + SciPy make the server bundle large. The exported file holds the 700 decision trees as flat
arrays; `TreeModel.predict` walks all trees at once with numpy and returns the same numbers as LightGBM
(checked on export to within 1e-9).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
TREES_PATH = ROOT / "models" / "forecaster_trees.npz"


class TreeModel:
    """Sum of decision trees. Internal nodes and leaves are numbered globally across all trees;
    a child or root code >= 0 is an internal node, a code < 0 is leaf number (-code - 1)."""

    def __init__(self, path: Path = TREES_PATH):
        z = np.load(path)
        self.feature = z["feature"]            # per internal node: feature column
        self.threshold = z["threshold"]        # numeric split: x <= threshold goes left
        self.is_cat = z["is_cat"]              # categorical split: x in the set goes left
        self.cat_mask = z["cat_mask"]          # category set as a bitmask (category codes < 64)
        self.left = z["left"]
        self.right = z["right"]
        self.leaf_value = z["leaf_value"]
        self.roots = z["roots"]                # per tree: root code
        self.features = [str(f) for f in z["feature_names"]]
        self.categorical = set(str(f) for f in z["categorical"])

    def _matrix(self, X: pd.DataFrame) -> np.ndarray:
        cols = []
        for name in self.features:
            col = X[name]
            cols.append(col.cat.codes.to_numpy(np.float64) if name in self.categorical else col.to_numpy(np.float64))
        return np.column_stack(cols)

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        M = self._matrix(X)
        n = len(M)
        node = np.tile(self.roots, (n, 1))                     # (rows, trees)
        row = np.repeat(np.arange(n), len(self.roots)).reshape(n, -1)
        while True:
            live = node >= 0
            if not live.any():
                break
            idx = node[live]
            x = M[row[live], self.feature[idx]]
            codes = np.where(x >= 0, x, 63).astype(np.uint64)  # negative category = unseen: goes right
            in_set = ((self.cat_mask[idx] >> codes) & np.uint64(1)).astype(bool)
            go_left = np.where(self.is_cat[idx], in_set, x <= self.threshold[idx])
            node[live] = np.where(go_left, self.left[idx], self.right[idx])
        return self.leaf_value[-node - 1].sum(axis=1)


def export(joblib_path: Path = ROOT / "models" / "forecaster.joblib", out: Path = TREES_PATH) -> None:
    import joblib

    model = joblib.load(joblib_path)
    dump = model.booster_.dump_model()
    names = dump["feature_names"]
    categorical = [n for n, info in dump["feature_infos"].items() if info.get("values")]

    feature, threshold, is_cat, cat_mask, left, right, leaf_value, roots = [], [], [], [], [], [], [], []

    def add(node: dict) -> int:
        if "leaf_index" in node or "leaf_value" in node and "split_index" not in node:
            leaf_value.append(node["leaf_value"])
            return -len(leaf_value)                         # leaf k is stored as -(k + 1)
        i = len(feature)
        for lst, v in ((feature, node["split_feature"]), (threshold, 0.0), (is_cat, False), (cat_mask, 0),
                       (left, 0), (right, 0)):
            lst.append(v)
        if node["decision_type"] == "==":
            is_cat[i] = True
            mask = 0
            for c in str(node["threshold"]).split("||"):
                if int(c) >= 63:
                    raise ValueError("category code too large for the bitmask")
                mask |= 1 << int(c)
            cat_mask[i] = mask
        elif node["decision_type"] == "<=":
            threshold[i] = float(node["threshold"])
        else:
            raise ValueError(f"unsupported split {node['decision_type']}")
        if node.get("missing_type", "None") != "None":
            raise ValueError("splits with missing-value handling aren't supported")
        left[i] = add(node["left_child"])
        right[i] = add(node["right_child"])
        return i

    for tree in dump["tree_info"]:
        roots.append(add(tree["tree_structure"]))

    out.parent.mkdir(exist_ok=True)
    np.savez_compressed(
        out, feature=np.array(feature, np.int32), threshold=np.array(threshold, np.float64),
        is_cat=np.array(is_cat, bool), cat_mask=np.array(cat_mask, np.uint64),
        left=np.array(left, np.int64), right=np.array(right, np.int64),
        leaf_value=np.array(leaf_value, np.float64), roots=np.array(roots, np.int64),
        feature_names=np.array(names), categorical=np.array(categorical))
    print(f"exported {len(roots)} trees, {len(feature)} splits -> {out} ({out.stat().st_size / 1e6:.1f} MB)")


def check(n_days: int = 30) -> float:
    """Largest difference between LightGBM and the numpy trees over many real prediction grids."""
    from datetime import date, timedelta

    import joblib

    from .features import day_grid, make_features
    from .predict import preset_knobs

    lgbm = joblib.load(ROOT / "models" / "forecaster.joblib")
    trees = TreeModel()
    worst = 0.0
    weeks = ["regular", "finals", "first_week", "winter_break", "midterms", "post_new_year"]
    weathers = ["clear", "rain", "snow", "hot"]
    for i in range(n_days):
        d = date(2026, 8, 24) + timedelta(days=9 * i)
        X = make_features(day_grid(d, preset_knobs(weeks[i % len(weeks)], weather=weathers[i % 4],
                                                  event_load=(i % 5) / 5)))
        worst = max(worst, float(np.abs(lgbm.predict(X) - trees.predict(X)).max()))
    return worst


if __name__ == "__main__":
    export()
    print(f"largest difference vs LightGBM over 30 days x 425 zone-hours: {check():.2e}")
