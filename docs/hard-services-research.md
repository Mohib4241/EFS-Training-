# Hard Services research and model contracts

Research date: 27 October 2026. Baseline: main commit 7905169. The user confirmed that HVAC Cascade means staged plant control. The completed scope covers all six existing catalogue leaves and 77 major teaching assemblies. Selected established manufacturers are references, not an endorsement or a claim to be the universally best brand.

Published family features and mathematical examples are explicitly separated. WEG catalogue construction was available through the indexed official product page; direct page retrieval returned 403. The Mitsubishi Electric announcement was available through the indexed official page; direct retrieval returned 502. ABB, STAMFORD and Megger technical documents and Fluke specifications were also inspected. Exact variants, full bills of materials, internal PCB layouts, winding designs and product operating curves remain outside the evidence available here. Original educational geometry is not manufacturer CAD.

The architecture, responsibilities, dependencies and acceptance plan are recorded in [the compact working brief](working-brief.md). Content, calculations, rendering and interaction are separate source files within the existing native JavaScript app. No new runtime dependency was added.

## Single-phase induction motor — WEG

Reference: W22 · capacitor start/run reference. 17 major teaching assemblies.

A main winding alone produces a pulsating field and no ideal starting torque at rest. An auxiliary winding with a capacitor provides a phase-shifted starting contribution. The start branch is switched out as the selected configuration accelerates; a run capacitor can remain in circuit.

### Published reference facts

- Reference: WEG W22 single-phase family.
- Published construction: Cast-iron frame; cooling fan and cowl.
- Starting arrangement: Capacitor variants and centrifugal switch.
- Actual rating: Depends on the selected product/nameplate.

### Mathematical contract

Fidelity B: educational mathematical relationship; not a manufacturer performance simulation. Geometry is Fidelity A.

| Input | Units | Teaching range / choices | Default |
|---|---|---|---|
| Supply frequency | Hz | 25–60; step 1 | 50 |
| Total magnetic poles | categorical | 2 poles; 4 poles; 6 poles; 8 poles | 4 |
| Selected steady slip | % | 1–10; step 0.5 | 4 |
| Starting circuit | categorical | Healthy start branch; Open start branch — virtual fault | healthy |

- nₛ = 120 f / p
- s = (nₛ − nᵣ) / nₛ
- nᵣ = nₛ(1 − s); fᵣ,forward = s f

nₛ = forward synchronous field speed (rpm); nᵣ = rotor speed (rpm); f = supply frequency (Hz); p = total poles; s = slip as a fraction (UI percent divided by 100); fᵣ,forward = rotor frequency relative to the forward field (Hz).

Steady forward-field kinematics only, after a successful start. Slip is selected, not predicted from load. The backward field, starting transient, capacitor sizing, current, torque and temperature are not solved. Frequency/pole changes are hypothetical teaching inputs, not product operating permissions.

Initial state: assembled, disconnected, stopped, no stored test voltage; parameters as above. Opening isolates the virtual energy source. The experiment calculation is a hypothetical steady example and remains labelled separately from running motion. No shaft acceleration or torque dynamics are solved; prescribed angular speed is used only for visual motion. Displayed rotation is slowed to 1/40 of the input-derived shaft rotation; the cascade fan animation is qualitative.

### Major assemblies

- **Finned frame:** The frame supports the stationary core and carries heat toward the outside air. A clean cooling surface helps heat leave; frame temperature alone does not identify a winding fault.
- **Laminated stator core:** Thin insulated steel sheets guide magnetic flux around the air gap. Laminations restrict circulating eddy currents compared with one solid steel block.
- **Main stator windings:** Insulated copper conductors carry the currents that establish the air-gap field. Insulation keeps adjacent conductors and the frame electrically separated.
- **Squirrel-cage rotor:** Conducting bars connected by end rings form closed rotor circuits. Relative motion between the field and bars induces current and electromagnetic torque.
- **Shaft and key:** The rotor transfers mechanical output through the shaft to a coupling or pulley. Alignment and loading affect bearings and connected equipment.
- **Drive-end bearing:** The bearing supports the shaft close to the driven equipment. Condition and correct loading influence vibration and reliability.
- **Non-drive-end bearing:** The second support locates the shaft at the fan end. Bearing type, lubrication and locating arrangement depend on the actual motor.
- **End shields:** The end shields support bearings and close the ends of the frame. Their alignment helps preserve a uniform air gap.
- **External cooling fan:** A shaft-mounted fan moves ambient air over the frame. Blocked airflow reduces cooling even if the shaft continues to rotate.
- **Fan cowl:** The guard separates the fan from contact and directs cooling air. A missing or damaged guard needs attention before use.
- **Terminal box:** The enclosure protects the motor connection area. Heat staining, damaged entries or loose covers require competent assessment.
- **Terminal board:** Insulated supports carry winding terminals and connection links. The actual nameplate and connection drawing determine links; this model is not a wiring diagram.
- **Protective earth point:** A dedicated bonding point connects exposed conductive parts to the protective system. Continuity and fault protection must be assessed under the applicable site procedure.
- **Mounting feet:** Feet transfer weight and reaction forces into the supporting structure. Sound support and alignment help reduce vibration.
- **Auxiliary winding:** A displaced winding contributes a phase-shifted field during starting. Without a functioning starting arrangement, this ideal motor cannot self-start from rest.
- **Start and run capacitors:** Capacitors shape winding-current phase; start and run duties are different. Correct capacitance and voltage rating come from the exact motor instructions. Stored charge may remain after isolation.
- **Centrifugal start switch:** A speed-operated mechanism removes the start branch in this representative arrangement. A start switch is not a general-purpose overload protective device.

### Isolated observation practice

The guide precedes practice. Isolation must be recorded, each area identified in order, and the concern reported.

1. **Inspect the fan guard:** Look for damage and restricted cooling passages. A running shaft does not prove adequate cooling.
2. **Observe the mounting:** Notice a secure-looking base; a visual model cannot establish bolt torque or alignment.
3. **Observe the capacitor enclosure:** Look at the marked housing without opening a real capacitor enclosure. Training finding: A damaged capacitor housing is represented by the amber marker. Isolate and report; stored energy requires competent handling.

### Primary references

- [WEG · W22 single-phase construction](https://www.weg.net/catalog/weg/DO/en/WMO_MOTORS_COM_SP_W22_BR?productCodeForRestriction=14018469)
- [Nidec · induction speed and slip](https://www.nidec.com/en/products/small-precision-motors/contents/technology/motor/basic/00027/)
- [DOE · electrical science, AC machines](https://www.energy.gov/sites/default/files/2026-04/DOE-HDBK-1011-92_VOL4.pdf)
- [Fluke · starting-circuit and stored-charge explanation](https://www.fluke.com/en-ca/learn/blog/motors-drives-pumps-compressors/centrifugal-thermal-and-capacitor-switches-cause-most-single-phase-motor-malfunctions)

## Three-phase induction motor — ABB

Reference: M3BP · process performance family. 14 major teaching assemblies.

Three-phase stator currents establish a rotating field. Relative motion induces currents in the cage; magnetic interaction develops torque. Over a normal stable motoring region, greater mechanical load generally requires more slip, but a load-to-speed prediction needs an equivalent circuit or measured curve.

### Published reference facts

- Reference: ABB M3BP process performance family.
- Published construction: Three-phase squirrel-cage, cast iron.
- Cooling reference: Totally enclosed fan-cooled (IC411).
- Ratings and connection: Use the exact motor nameplate.

### Mathematical contract

Fidelity B: educational mathematical relationship; not a manufacturer performance simulation. Geometry is Fidelity A.

| Input | Units | Teaching range / choices | Default |
|---|---|---|---|
| Supply frequency | Hz | 25–60; step 1 | 50 |
| Total magnetic poles | categorical | 2 poles; 4 poles; 6 poles; 8 poles | 4 |
| Selected steady slip | % | 1–10; step 0.5 | 4 |
| Assumed air-gap power | W | 100–5000; step 100 | 1000 |
| Virtual phase sequence | categorical | ABC — forward; ACB — reverse | ABC |
| Virtual protection scenario | categorical | Three phases available; Phase-loss protection trips | healthy |

- nₛ = 120 f / p; nᵣ = nₛ(1 − s)
- fᵣ = s f
- Pcu,rotor = s Pgap; Pconverted = (1 − s) Pgap

nₛ and nᵣ are field and rotor speeds (rpm); f is supply frequency (Hz); p is total poles; s is fractional slip (UI percent divided by 100); fᵣ is rotor current frequency (Hz). Pgap, Pcu,rotor and Pconverted are air-gap input, rotor copper loss and converted mechanical power, all in watts.

Balanced sinusoidal steady-state motoring. Slip and air-gap power are assumed inputs; no load/torque/current characteristic is predicted. Converted power is before friction, windage and other mechanical losses, so it is not nameplate shaft output. Phase-loss stopping is an illustrative protection interlock, not a prediction of every unprotected motor.

Initial state: assembled, disconnected, stopped, no stored test voltage; parameters as above. Opening isolates the virtual energy source. The experiment calculation is a hypothetical steady example and remains labelled separately from running motion. No shaft acceleration or torque dynamics are solved; prescribed angular speed is used only for visual motion. Displayed rotation is slowed to 1/40 of the input-derived shaft rotation; the cascade fan animation is qualitative.

### Major assemblies

- **Finned frame:** The frame supports the stationary core and carries heat toward the outside air. A clean cooling surface helps heat leave; frame temperature alone does not identify a winding fault.
- **Laminated stator core:** Thin insulated steel sheets guide magnetic flux around the air gap. Laminations restrict circulating eddy currents compared with one solid steel block.
- **Main stator windings:** Insulated copper conductors carry the currents that establish the air-gap field. Insulation keeps adjacent conductors and the frame electrically separated.
- **Squirrel-cage rotor:** Conducting bars connected by end rings form closed rotor circuits. Relative motion between the field and bars induces current and electromagnetic torque.
- **Shaft and key:** The rotor transfers mechanical output through the shaft to a coupling or pulley. Alignment and loading affect bearings and connected equipment.
- **Drive-end bearing:** The bearing supports the shaft close to the driven equipment. Condition and correct loading influence vibration and reliability.
- **Non-drive-end bearing:** The second support locates the shaft at the fan end. Bearing type, lubrication and locating arrangement depend on the actual motor.
- **End shields:** The end shields support bearings and close the ends of the frame. Their alignment helps preserve a uniform air gap.
- **External cooling fan:** A shaft-mounted fan moves ambient air over the frame. Blocked airflow reduces cooling even if the shaft continues to rotate.
- **Fan cowl:** The guard separates the fan from contact and directs cooling air. A missing or damaged guard needs attention before use.
- **Terminal box:** The enclosure protects the motor connection area. Heat staining, damaged entries or loose covers require competent assessment.
- **Terminal board:** Insulated supports carry winding terminals and connection links. The actual nameplate and connection drawing determine links; this model is not a wiring diagram.
- **Protective earth point:** A dedicated bonding point connects exposed conductive parts to the protective system. Continuity and fault protection must be assessed under the applicable site procedure.
- **Mounting feet:** Feet transfer weight and reaction forces into the supporting structure. Sound support and alignment help reduce vibration.

### Isolated observation practice

The guide precedes practice. Isolation must be recorded, each area identified in order, and the concern reported.

1. **Inspect the fan guard:** Look for damage and restricted cooling passages. A running shaft does not prove adequate cooling.
2. **Observe the mounting:** Notice a secure-looking base; a visual model cannot establish bolt torque or alignment.
3. **Recognise connection-area damage:** Observe the marked terminal-box area. Do not open or repair real terminals from this exercise. Training finding: Heat staining is shown on the terminal-box cover. Keep the motor out of use and report it.

### Primary references

- [ABB · low-voltage motor manual](https://motorswechat.abb.com.cn/motor/upload/manual/M3BP_M3AA_%E8%AF%B4%E6%98%8E%E4%B9%A6-202206.pdf)
- [Nidec · induction speed and slip](https://www.nidec.com/en/products/small-precision-motors/contents/technology/motor/basic/00027/)
- [DOE · electrical science, AC machines](https://www.energy.gov/sites/default/files/2026-04/DOE-HDBK-1011-92_VOL4.pdf)
- [ABB · process performance construction](https://library.e.abb.com/public/78fcb6312ebb425ca254e1d68243aea6/ACH580_Catalog_RevG.pdf)

## Brushless synchronous alternator — STAMFORD

Reference: UC274 · UCI274H reference. 14 major teaching assemblies.

A prime mover rotates the main field and induces AC in the stationary output windings. A brushless exciter and rotating rectifier provide main-rotor DC excitation. The AVR controls excitation to regulate voltage; speed determines electrical frequency. This experiment shows open-circuit EMF, without an active AVR loop.

### Published reference facts

- Reference document: UCI274H · winding 17 data sheet.
- Published system: Brushless excitation and rotating rectifier.
- Output connection reference: Three-phase, 12 reconnectable ends.
- Regulator / output rating: Variant-dependent; see the reference sheet.

### Mathematical contract

Fidelity B: educational mathematical relationship; not a manufacturer performance simulation. Geometry is Fidelity A.

| Input | Units | Teaching range / choices | Default |
|---|---|---|---|
| Assumed shaft speed | rpm | 900–1800; step 30 | 1500 |
| Assumed flux relative to reference | pu | 0.2–1.2; step 0.05 | 1 |

- f = p n / 120; p = 4 in this example
- Eᵣₘₛ = 4.44 k_w N Φ f (sinusoidal fundamental)
- E / Eref = (n / 1500 rpm)(Φ / Φref)

f = generated frequency (Hz); p = total poles; n = shaft speed (rpm); Eᵣₘₛ = sinusoidal fundamental open-circuit EMF (V); k_w = dimensionless winding factor; N = series turns per phase; Φ = fundamental flux per pole (Wb). The actual calculation uses per-unit EMF and flux, so the unchanged winding factors cancel; no terminal-voltage rating is inferred.

Four-pole, sinusoidal open-circuit example with fixed winding factors and linear assumed flux. The EMF output is per-unit relative to an arbitrary reference, not terminal volts or a UCI274H rating. No saturation, transient, AVR regulation, load drop, reactive power, paralleling or protection settings are calculated.

Initial state: assembled, disconnected, stopped, no stored test voltage; parameters as above. Opening isolates the virtual energy source. The experiment calculation is a hypothetical steady example and remains labelled separately from running motion. No shaft acceleration or torque dynamics are solved; prescribed angular speed is used only for visual motion. Displayed rotation is slowed to 1/40 of the input-derived shaft rotation; the cascade fan animation is qualitative.

### Major assemblies

- **Main frame:** The frame locates the stator and supports the machine assembly. Mechanical support and cooling access both matter to generator reliability.
- **Main stator core:** A laminated magnetic core carries the stationary output winding. An alternating magnetic field links the winding as the rotor passes.
- **Output windings:** The main armature windings deliver three-phase AC to the terminals. The output frequency follows pole count and shaft speed.
- **Main field rotor:** DC excitation establishes the rotating magnetic field. Field strength affects open-circuit induced voltage; electrical load and AVR action need more modelling.
- **Shaft:** The shaft transmits mechanical power into the rotor. Electrical power is not created without mechanical input; losses also need input power.
- **Drive coupling disc:** The coupling connects the alternator rotor to its prime mover. Alignment, guards and exact coupling instructions are equipment-specific.
- **Bearing support:** The bearing supports the rotor at the non-drive end in this representative layout. A single-bearing arrangement relies on the correctly assembled generating set.
- **Exciter stator:** A stationary field winding establishes exciter flux under regulator control. Excitation control changes the main-field supply through the brushless chain.
- **Exciter rotor:** Rotation through the exciter field produces AC for the rotating rectifier. The exciter transfers electrical energy onto the rotating assembly without main-field brushes.
- **Rotating rectifier:** A diode bridge converts exciter AC to main-field DC. A failed diode can disrupt field excitation; this model does not diagnose a real diode.
- **Automatic voltage regulator:** The regulator senses output and controls exciter field current. AVR regulation is different from governing shaft speed and frequency.
- **Output terminal box:** The enclosure protects winding connections and auxiliary equipment. A visual check cannot establish electrical safety or correct reconnection.
- **Cooling fan:** The fan draws cooling air through the machine. Restricted ventilation can increase thermal stress.
- **Air inlet screen:** The screen guards the cooling-air opening. Obstruction reduces the available cooling path.

### Isolated observation practice

The guide precedes practice. Isolation must be recorded, each area identified in order, and the concern reported.

1. **Observe coupling protection:** Identify the drive interface. This exercise does not authorise removal of a real guard.
2. **Observe terminal enclosure:** Notice covers and entries without working on real connections.
3. **Recognise restricted ventilation:** Inspect the marked inlet screen. Training finding: The amber marker represents obstructed ventilation. Keep the set out of use pending competent assessment.

### Primary references

- [STAMFORD · UCI274H winding 17 data sheet](https://www.stamford-avk.com/sites/stamfordavk/files/UCI274H-17-TD-EN_Rev_A.pdf)
- [DOE · electrical science, AC machines](https://www.energy.gov/sites/default/files/2026-04/DOE-HDBK-1011-92_VOL4.pdf)
- [STAMFORD · alternator service guide](https://www.stamford-avk.com/sites/stamfordavk/files/content-files/STAMFORD-AvK-Alternator-Service-Guide.pdf)

## Insulation resistance tester — Megger

Reference: MIT420/2 · instrument reference. 10 major teaching assemblies.

The tester applies a selected DC voltage and infers insulation resistance from measured current. Real insulation can have charging and absorption currents as well as steady leakage. This example isolates the steady resistive relationship and a separate illustrative RC discharge.

### Published reference facts

- Reference: Megger MIT420/2.
- Published fixed test steps: 50 / 100 / 250 / 500 / 1000 V DC.
- Family features: Insulation / continuity; PI and DAR on this model.
- This experiment: Ideal resistor plus an illustrative discharge path.

### Mathematical contract

Fidelity B: educational mathematical relationship; not a manufacturer performance simulation. Geometry is Fidelity A.

| Input | Units | Teaching range / choices | Default |
|---|---|---|---|
| Virtual DC test voltage | categorical | 50 V; 100 V; 250 V; 500 V; 1000 V | 500 |
| Assumed insulation resistance | MΩ | 1–500; step 1 | 100 |
| Virtual item isolated and proved dead | categorical | true / false | false |

- Ileak [µA] = Vtest [V] / Rins [MΩ]
- Vstored(t) = V₀ exp(−t / RC)
- Illustration: Rdischarge = 1 MΩ; C = 1 µF; τ = 1 s

Vtest and Vstored are DC voltages (V); Rins is insulation resistance (MΩ); Ileak is current (µA). In the separate discharge equation R is in ohms, C in farads and t in seconds, giving RC in seconds. One megohm times one microfarad is one second.

Ideal steady resistor with no absorption, humidity, temperature correction, lead leakage or instrument error. The separate ideal capacitor charges instantly for illustration. Discharge uses simulation time and pauses off-page. The UI advances it about every 100 ms, capping each update at 0.25 simulated seconds; the exact exponential is used for each interval. Values below 0.1 V are displayed as zero to end this exercise; this is not a real safe-voltage criterion. No universal insulation pass threshold is provided.

Initial state: assembled, disconnected, stopped, no stored test voltage; parameters as above. Opening isolates the virtual energy source. The experiment calculation is a hypothetical steady example and remains labelled separately from running motion. No shaft acceleration or torque dynamics are solved; prescribed angular speed is used only for visual motion. Displayed rotation is slowed to 1/40 of the input-derived shaft rotation; the cascade fan animation is qualitative.

### Major assemblies

- **Protective case:** An insulating enclosure protects the instrument and user interface. Damage can compromise intended protection; a category marking is not permission for every test.
- **Measurement display:** The display shows the virtual reading and residual-voltage state. A resistance result does not by itself establish a universal pass/fail limit.
- **Function and voltage selector:** The selector chooses the test function and voltage. The permitted test voltage depends on the item under test and connected electronics.
- **Test control:** A deliberate command enables the virtual test source. The model blocks testing until isolation and lead connection have been acknowledged.
- **Test terminals:** The insulated sockets connect the tester to its leads. Correct accessories and undamaged insulation are part of the whole measurement system.
- **Insulated leads and clips:** The leads complete the test path around the example insulation. Damaged insulation requires removal from use rather than cosmetic repair.
- **Source and measurement blocks:** A generic block represents voltage generation and current sensing. Its geometry and component positions are not a manufacturer circuit diagram.
- **Discharge path block:** A schematic resistor represents stored-charge decay after testing. Megger describes automatic discharge; the resistance and capacitance here are authored examples, not internal product values.
- **Battery supply:** The battery powers the instrument electronics and test source. Low battery or damage can affect a test; replacement follows the exact manual.
- **Rear cover:** The rear enclosure protects the battery and internal circuitry. Remove real leads and follow the manual before any permitted user maintenance.

### Isolated observation practice

The guide precedes practice. Isolation must be recorded, each area identified in order, and the concern reported.

1. **Observe the enclosure:** Check the schematic case and labels; appearance alone cannot verify protection.
2. **Observe the sockets:** Identify clean, undamaged-looking socket areas without touching real conductors.
3. **Recognise lead damage:** Look at the marked lead. Training finding: The amber mark represents damaged lead insulation. Remove the tester and lead set from use and report the concern.

### Primary references

- [Megger · MIT400/2 family and documents](https://www.megger.com/en-ca/products/mit400/2-series)
- [Megger · MIT400/2 user guide](https://www.megger.com/sites/g/files/utfabz201/files/acquiadam/2024-11/MIT4002--MIT4202--MIT4302--MIT4802--MIT2500_UG_en.pdf)
- [Megger · MIT400/2 data sheet](https://www.megger.com/sites/g/files/utfabz201/files/acquiadam_assets/2022-06/MIT4002_DS_en.pdf)

## Digital multimeter — Fluke

Reference: 87V · industrial multimeter reference. 10 major teaching assemblies.

A voltmeter measures across a component with high input resistance. Current measurement uses a series path through a suitable current input. Resistance measurement uses the meter’s own test source and requires an isolated circuit. The scene changes the lead arrangement with the selected function.

### Published reference facts

- Reference: Fluke 87V.
- Published AC/DC voltage capability: Up to 1000 V under specified conditions.
- Published current capability: 10 A; use exact manual and accessory limits.
- Published capability: True-RMS AC; resistance and other functions.

### Mathematical contract

Fidelity B: educational mathematical relationship; not a manufacturer performance simulation. Geometry is Fidelity A.

| Input | Units | Teaching range / choices | Default |
|---|---|---|---|
| Virtual DC source | V | 12–48; step 1 | 24 |
| Assumed load resistor | Ω | 100–5000; step 100 | 1000 |
| Meter function | categorical | DC volts — parallel; DC current — series; Resistance — isolated | V |
| Red input jack | categorical | VΩ input; A input | VΩ |
| Virtual circuit isolated | categorical | true / false | false |

- V = I R
- I [mA] = 1000 Vsource / Rload
- Rmode = Rload only with source isolated

V = DC voltage (V); I = DC current (A); R = resistance (Ω). The displayed current in milliamps is 1000 times the current in amps (1 A = 1000 mA). Vsource and Rload are the assumed source voltage and load resistance; Rmode is the ideal isolated-resistor result.

Ideal DC source, resistor and meter: infinite voltmeter input resistance, zero current-path burden, no uncertainty or frequency effects. This 12–48 V mathematical circuit is not a real instrument connection procedure. The Ω interlock and jack checks illustrate important conditions; they cannot establish real electrical safety or replace proving dead.

Initial state: assembled, disconnected, stopped, no stored test voltage; parameters as above. Opening isolates the virtual energy source. The experiment calculation is a hypothetical steady example and remains labelled separately from running motion. No shaft acceleration or torque dynamics are solved; prescribed angular speed is used only for visual motion. Displayed rotation is slowed to 1/40 of the input-derived shaft rotation; the cascade fan animation is qualitative.

### Major assemblies

- **Protective holster:** The yellow holster surrounds the instrument body. Mechanical protection does not make an incorrect connection safe.
- **Instrument body:** The body supports the interface and insulated input system. Cracks or missing parts require attention before use.
- **Digital display:** The display presents an ideal DC teaching result or an interlock message. True-RMS is a published 87V capability; this experiment uses only DC.
- **Rotary function switch:** The function switch selects the measurement path. The function, lead jack and circuit connection must agree.
- **Input sockets:** COM is the common connection; the red lead uses VΩ or A for this exercise. A current input is not a voltage-measurement input. The model rejects a mismatch.
- **Probe leads:** Insulated leads connect the example circuit to the meter. Damaged insulation is a reason to remove the lead set from service.
- **Current-input fuse blocks:** Generic fuse blocks represent protection in current measurement paths. Only the specified manufacturer fuse is suitable; this view gives no replacement rating or repair instruction.
- **Measurement circuit block:** The generic board represents dividers, shunts and conversion electronics. A real input has finite impedance and measurement uncertainty. Neither is solved here.
- **Instrument battery:** The battery supplies the electronics and resistance-test function. The device manual governs battery access and inspection.
- **Rear cover and stand:** The rear shell closes the case and supports the stand. User maintenance requires the correct manual and disconnected leads.

### Isolated observation practice

The guide precedes practice. Isolation must be recorded, each area identified in order, and the concern reported.

1. **Observe body and markings:** Identify the intact-looking shell and markings; check suitability against the real task and manual.
2. **Observe input sockets:** Notice the selected jack and undamaged-looking socket surrounds.
3. **Recognise damaged insulation:** Inspect the marked probe lead. Training finding: The amber marker represents damaged insulation. Remove the meter/lead set from use and report it.

### Primary references

- [Fluke · 87V specifications and manuals](https://www.fluke.com/en-us/product/electrical-testing/digital-multimeters/fluke-87v)

## HVAC cascade control — Mitsubishi Electric

Reference: Ecodan CAHV-R · multi-unit reference. 12 major teaching assemblies.

A controller enables available units in a chosen order as demand rises. Lead rotation shares operating hours; unavailable units are skipped. Common water headers combine output. Flow proof and other protective conditions must permit operation. This module illustrates steady staging rather than a proprietary controller sequence.

### Published reference facts

- Reference: Mitsubishi Electric Ecodan CAHV-R.
- Published feature: Multi-unit cascade and run-hours rotation.
- Published system example: Up to 16 units / 640 kW at A7W35 (air 7°C, water 35°C).
- This scene: Three equal assumed 40 kW stages.

### Mathematical contract

Fidelity B: educational mathematical relationship; not a manufacturer performance simulation. Geometry is Fidelity A.

| Input | Units | Teaching range / choices | Default |
|---|---|---|---|
| Building heating demand | kW | 0–150; step 5 | 60 |
| Assumed flow-return difference | K | 3–10; step 0.5 | 5 |
| Request sequence | categorical | Fixed: 1 → 2 → 3; Least example run-hours first | hours |
| Unit availability | categorical | All units available; Unit 1 unavailable; Unit 2 unavailable; Unit 3 unavailable | 0 |
| Virtual water flow proved | categorical | true / false | true |

- Nrequested = ceil(Qdemand / 40 kW), limited to available units
- Qdelivered = min(Qdemand, Nrequested × 40 kW)
- Qunmet = Qdemand − Qdelivered
- ṁ = Qdelivered / (cp ΔT); cp = 4.18 kJ/(kg K)

Qdemand, Qdelivered and Qunmet are thermal rates (kW); Nrequested is a unit count; ceil rounds up to an integer. Each teaching stage has 40 kW assumed capacity. ṁ is water mass flow (kg/s); cp is water specific heat (kJ/(kg K)); ΔT is the assumed water temperature difference (K). A kW is a kJ/s.

Three equal hypothetical 40 kW stages with ideal continuous modulation from zero to full output. Actual CAHV-R capacity depends on conditions and its minimum modulation must be respected. Example accumulated hours are 120, 70 and 95 h; the hour-based order is 2 → 3 → 1. No proprietary sequencing, timers, hysteresis, minimum on/off time, defrost, COP, pump head, building dynamics or electrical consumption is predicted. Flow proof is a conceptual interlock; computed mass flow is a thermal balance, not a pump selection.

Initial state: assembled, disconnected, stopped, no stored test voltage; parameters as above. Opening isolates the virtual energy source. The experiment calculation is a hypothetical steady example and remains labelled separately from running motion. No shaft acceleration or torque dynamics are solved; prescribed angular speed is used only for visual motion. Displayed rotation is slowed to 1/40 of the input-derived shaft rotation; the cascade fan animation is qualitative.

### Major assemblies

- **Plant supports:** Supports carry units and pipework while allowing access. Sound support and service clearances are part of the complete installation.
- **Heat pump 1:** One monobloc heat source transfers heat into the common water circuit. An enabled unit contributes only within its available operating capacity.
- **Heat pump 2:** A second source provides another stage of available capacity. It may lead or lag depending on the selected sequence and availability.
- **Heat pump 3:** The third source extends capacity and can replace an unavailable unit if capacity remains. Redundancy does not guarantee that the full building load can still be served.
- **Flow and return headers:** Common headers distribute return water and combine heated flow. Heat-source stages are hydraulically connected in parallel in this example.
- **Circulation pumps:** Pumps provide circulation through the plant and load circuits. Heating duty needs adequate water flow as well as enabled heat sources.
- **Branch isolation and check valves:** The branch valves represent isolation and prevention of unwanted reverse flow. This arrangement is illustrative; valve selection and positioning require the project schematic.
- **Buffer / hydraulic separation:** A generic water vessel represents system volume and hydraulic decoupling. Stored water can help manage transients; this example does not calculate buffer size or anti-cycling volume.
- **Common temperature sensors:** Sensors report common water temperatures to the controller. Incorrect readings can cause poor staging; sensor positions and control strategy are design-specific.
- **Flow-proof interlock:** A virtual input indicates whether adequate circulation has been established. With flow proof absent, this teaching controller inhibits heat-source requests. Never bypass a real interlock.
- **Cascade controller and communications:** The controller coordinates unit requests and receives availability signals. Lead rotation shares use; it does not by itself prove energy savings or guarantee duty coverage.
- **Building heating circuit:** The load receives useful thermal output from the plant. Unmet demand appears when available heat-source capacity is insufficient.

### Isolated observation practice

The guide precedes practice. Isolation must be recorded, each area identified in order, and the concern reported.

1. **Observe headers and insulation:** Identify visible pipework condition without opening or draining real systems.
2. **Review flow-proof protection:** Identify the flow-proof input and why it must not be bypassed.
3. **Recognise an obstructed outdoor coil:** Observe the marked heat-pump face. Training finding: The amber marker represents a blocked air path at unit 2. Record and report the condition for competent assessment.

### Primary references

- [Mitsubishi Electric · CAHV-R cascade and rotation](https://les.mitsubishielectric.co.uk/latest-news/mitsubishi-electric-launches-new-ecodan-cahv-r-commercial-air-source-heat-pump)
- [Viessmann · commercial heat-pump cascade principles](https://www.viessmann.co.uk/content/dam/public-brands/gb/pdf/technology-brochures/en/commercial/Vitocal-300-G-Pro-Technical-Guide.pdf/_jcr_content/renditions/original.media_file.download_attachment.file/Vitocal-300-G-Pro-Technical-Guide.pdf)

## Executed analytical verification

The Node test run passed 41 tests, including all 29 prior regressions and 12 new Hard Services tests. Expected scalar cases are fixed independently of rendering; arithmetic comparisons use an absolute 1e-9 tolerance. That tolerance checks implementation arithmetic, not instrument accuracy or manufacturer performance.

| Case | Expected / executed result |
|---|---|
| Four-pole induction, 50 Hz, 4% selected slip | 1500 rpm field; 1440 rpm selected rotor; 2 Hz forward rotor frequency |
| Three-phase air-gap power 1000 W, 4% slip | 40 W rotor copper loss; 960 W converted before mechanical losses |
| Induction power balance across 1/4/10% slip and 100/1000/5000 W | Copper plus converted power equals air-gap input |
| Four-pole alternator at 1500 / 1800 rpm | 50 / 60 Hz; excitation does not change frequency |
| Ideal insulation 100 MΩ at 500 / 1000 V | 5 / 10 µA steady leakage |
| Authored RC discharge, 500 V, one-second time constant | 183.9397205857 V after one simulated second; controls unlock only after the illustrative end threshold |
| Ideal 24 V, 1000 Ω circuit | 24 V in parallel voltage mode; 24 mA in series current mode; isolated resistance 1000 Ω |
| HVAC 60 kW, three assumed 40 kW stages, example hours 120/70/95 | Units 2 then 3 requested; 60 kW served; 2.8708133971 kg/s at 5 K |
| HVAC 100 kW, one stage unavailable | 80 kW served; 20 kW unmet |
| HVAC zero demand / absent flow proof | No heat-source requests; unmet demand shown when flow proof is absent |

Interlock tests cover open starting branch, phase-loss protection, wrong instrument jack, resistance mode on a powered example, stored-charge reveal/disconnection protection, input types/ranges, immutable defaults, lesson-before-practice, isolation, observation order and correct fault response.

## Remaining limits

These are engineering education modules, not design calculations, electrical safety certification, maintenance schedules or commissioning procedures. Real plant needs its exact product documentation, site procedures, controls strategy and competent assessment. Broad device frame-rate benchmarks, full assistive-technology qualification, physical multi-touch tests, manufacturer geometry verification and field measurements are not established.
