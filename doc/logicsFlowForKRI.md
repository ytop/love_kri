
case 1: 10 "Pending Input" OR 20 "Under Rework"
  User can input data if have proper permission
    -> subcase 1: user clicked save button
      -> change to "Saved"
    -> subcase 2: user clicked submit button
      IF KRI_OWNER == DATA_PROVIDER (in kri record)
      -> change to "Submitted to KRI Owner Approver"
      ELSE KRI_OWNER <> DATA_PROVIDER
      -> change to "Submitted to Data Provider Approver"

case 2: 30 "Saved"
  User can input data if have proper permission
    -> subcase 1: user clicked save button
      -> remain at state "Saved" but update value
    -> subcase 2: user clicked submit button
      IF KRI_OWNER == DATA_PROVIDER (in kri record)
      -> change to "Submitted to KRI Owner Approver"
      ELSE KRI_OWNER <> DATA_PROVIDER
      -> change to "Submitted to Data Provider Approver"

case 3: 40 "Submitted to Data Provider Approver" OR 50 "Submitted to KRI Owner Approver"
  User can approve data if have proper permission
    -> subcase 1: user clicked approve button
      IF KRI_OWNER == DATA_PROVIDER AND STATUS = 50
      -> change to 60 "Finalized"
      ELSE KRI_OWNER <> DATA_PROVIDER AND STATUS = 40
      -> change to 60 "Finalized"
      ELSE:
      SHOULD NOT HAPPEN
    -> subcase 2: user clicked reject button
      PROVIDE REJECT REASON
      -> change to 20 "Under Rework"
