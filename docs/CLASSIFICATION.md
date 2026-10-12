# Duration inference is a hypothesis

A visit can include walking, digging, elimination and burying. Duration alone cannot determine urine versus stool, and both can occur in one visit.

Priority: explicit user label; upstream positive detection; per-cat duration estimate; unknown. Original upstream fields are never rewritten by an estimate. Explicit unknown prevents inference for that event. Unknown cat IDs never inherit another cat's model.

With at least three labeled urine and three labeled stool samples, the model compares log-duration medians. It requires >=80% leave-one-out balanced accuracy and a median ratio >=1.3. This score only measures separation in this small dataset, not clinical accuracy or future reliability. Upstream single-class positives can themselves be incomplete.

Without sufficient labels, >=12 valid visits, >=3 per cluster and a median ratio >=1.6 can produce a low-confidence short=urine/long=stool hypothesis. That mapping is not established physiology. Overlap, insufficient data and values outside the reference range remain unknown. Do not use inferred outputs as training labels. Supervised labels with poor separation do not fall back to clustering.

Models currently use the selected query window, so changing dates can change estimates. Labels persist; model estimates are recomputed. Planned work includes stable training windows and evaluation using consented, de-identified labels. Do not infer illness or delay veterinary care based on these estimates.
