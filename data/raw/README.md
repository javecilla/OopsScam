# Public datasets (third-party, real messages)

These files are redistributed unmodified under their own licenses, for training the OopsScam classifier (`training/train.py`). They contain real messages published by their authors; they are **not** our data and are not covered by this repo's MIT license. Personal names are replaced with `NAME` in memory before training; the files themselves are kept exactly as downloaded.

| Folder | Dataset | Author / source | License |
| --- | --- | --- | --- |
| `ph_spam/text-messages.csv` | PH Spam + Marketing SMS | Scott Lee Chua, Kaggle | CC BY 4.0 |
| `tagalog_sms/tagalog-sms.xlsx` | Tagalog-SMS ("Philippines SMS Collection") | onzero0, Kaggle: https://www.kaggle.com/datasets/onzero0/tagalog-sms | CC0: Public Domain |
| `mishra_soni/Dataset_5971.csv` | SMS Phishing Dataset for Machine Learning and Pattern Recognition | Sandhya Mishra and Devpriya Soni, Mendeley Data, 2022: https://doi.org/10.17632/f45bkkt8pr.1 | CC BY 4.0 |

CC BY 4.0 credit: the PH Spam + Marketing SMS and SMS Phishing datasets are used with attribution to the authors above; no changes were made to the files. License texts: https://creativecommons.org/licenses/by/4.0/ and https://creativecommons.org/publicdomain/zero/1.0/

Not stored here: the UCI SMS Spam Collection (download with `training/fetch_uci.py`; no longer used for training).
