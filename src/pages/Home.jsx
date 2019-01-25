import React, { Component } from 'react';
import './Home.scss';
import {
  Container,
  Row,
  Col,
  Button,
  Input,
  Label,
  FormGroup,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  Table,
  ModalFooter,
} from 'reactstrap';
import { ComposableMap, ZoomableGroup, Geographies, Geography } from 'react-simple-maps';
import Map from 'maps/map.json';
import axios from 'axios';
import { LineChart } from 'react-chartkick';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import NumberFormat from 'react-number-format';
import { Tooltip } from 'react-tippy';

import Select from 'react-select';

export default class Home extends Component {
  colorMap = {
    'Low income': '#f06f65',
    'Lower middle income': '#f8b166',
    'Upper middle income': '#fff389',
    'High income: nonOECD': '#54d470',
    'High income: OECD': '#54d470',
  };

  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.updateIndicatorInfo = this.updateIndicatorInfo.bind(this);
    this.testDb = this.testDb.bind(this);
    this.fetchBestWorst = this.fetchBestWorst.bind(this);
    const yearsSelect = [];
    for (let i = 1960; i <= 2010; i += 1) {
      yearsSelect.push({ value: i, label: i });
    }
    let ind = [];
    this.state = {
      selectedCountry: '',
      selectedIndicator: 0,
      indicatorSource: null,
      result: null,
      modal: false,
      indicatorInfo: null,
      worldAvg: null,
      showWorldAvg: false,
      modalRegion: null,
      modalYear: 0,
      selectIncomeGroups: false,
      showIncomeGroups: true,
      bestWorstCountries: [],
      zoom: 1,
      yearsSelect,
    };
    axios.get('http://51.38.36.193:1323/indicators/list').then(r => {
      ind = r.data;
      axios.get('http://51.38.36.193:1323/countries').then(r2 => {
        const cm = {};
        const cn = {};
        r2.data.forEach(c => {
          cm[c.country_code] = c.income_group;
          cn[c.country_code] = c.country_name;
        });
        axios.get('http://51.38.36.193:1323/regions').then(r3 => {
          const regions = [];
          r3.data.forEach((v, i) => {
            if (v === '') return;
            regions.push({ value: i, label: v });
          });
          this.setState(previous => ({
            ...previous,
            countryMap: cm,
            countryNames: cn,
            indicators: ind,
            regions,
          }));
        });
      });
    });
  }

  getCountryColor(countryCode) {
    const {
      selectedCountry,
      result,
      countryMap,
      countryNames,
      selectIncomeGroups,
      showIncomeGroups,
    } = this.state;
    if (!countryMap || !showIncomeGroups) return '#adb5bd';
    if (countryCode === selectedCountry) return '#7aa9ee';
    if (selectIncomeGroups && result) {
      if (result.find(v => v.name === countryNames[countryCode])) {
        return '#7aa9ee';
      }
    }
    if (!countryMap[countryCode]) return '#adb5bd';
    if (!this.colorMap[countryMap[countryCode]]) return '#adb5bd';
    return this.colorMap[countryMap[countryCode]];
  }

  getCountryName() {
    const { selectedCountry, countryNames, selectIncomeGroups } = this.state;
    if (selectIncomeGroups) return selectedCountry;
    if (!selectedCountry || selectedCountry === '') return 'None';
    if (selectedCountry === '-99') return '???';
    return countryNames[selectedCountry];
  }

  handleClick(g) {
    const { selectedIndicator } = this.state;
    this.setState(() => ({ selectedCountry: g.properties.ISO_A3 }));
    if (selectedIndicator !== 0) this.testDb(g.properties.ISO_A3);
  }

  testDb(code) {
    const { selectedIndicator, selectIncomeGroups } = this.state;
    axios.get(`http://51.38.36.193:1323/indicators/${selectedIndicator}/${code}/values`).then(r => {
      const values = {};
      if (selectIncomeGroups) {
        this.setState({
          selectedCountry: r.data.regions.countries.income_group,
        });
        axios
          .get(
            `http://51.38.36.193:1323/indicators/${selectedIndicator}/incomeGroup/${
              r.data.regions.countries.income_group
            }/values`,
          )
          .then(r2 => {
            const cvalues = [];

            r2.data.forEach(v => {
              const c = {};
              v.regions.countries.values.forEach(value => {
                if (!value.indicator_value) return;
                c[value.year] = value.indicator_value;
              });
              cvalues.push({ name: v.regions.countries.country_name, data: c });
            });
            this.setState({
              result: cvalues,
            });
          });
        return;
      }
      r.data.regions.countries.values.forEach(v => {
        if (!v.indicator_value) return;
        values[v.year] = v.indicator_value;
      });
      this.setState({
        result: values,
      });
    });

    axios.get(`http://51.38.36.193:1323/indicators/${selectedIndicator}/worldAvg`).then(r => {
      const values = {};
      r.data.forEach(v => {
        if (v.value.nbPays === 0) return;
        values[v['_id']] = v.value.moyenne;
      });
      this.setState({ worldAvg: values });
    });

    axios.get(`http://51.38.36.193:1323/indicators/${selectedIndicator}/source`).then(r => {
      this.setState({ indicatorSource: r.data });
      console.log(r.data);
    });
  }

  toggleWorldAverage() {
    const { showWorldAvg } = this.state;
    this.setState({ showWorldAvg: !showWorldAvg });
  }

  toggleIncomeGroups() {
    const { showIncomeGroups } = this.state;
    this.setState({ showIncomeGroups: !showIncomeGroups });
  }

  toggleSelectIncomeGroups() {
    const { selectIncomeGroups } = this.state;
    this.setState({ selectIncomeGroups: !selectIncomeGroups });
  }

  fetchBestWorst() {
    const { modalRegion, modalYear, indicators, countryNames } = this.state;
    if (!modalRegion || modalYear === 0) return;
    axios
      .get(`http://51.38.36.193:1323/indicators/bestworst/${modalRegion}/${modalYear}`)
      .then(r => {
        const result = [];
        console.log(r.data.length);
        r.data.forEach((v, index) => {
          result.push(
            <tr key={index}>
              <td>{indicators.find(i => i.id === v['_id']).indicator_name}</td>
              <td>
                <Tooltip
                  arrow
                  html={
                    <>
                      <h6>{countryNames[v.value.max.code]}</h6>
                      <span>
                        <NumberFormat
                          value={v.value.max.value}
                          displayType="text"
                          thousandSeparator
                        />
                      </span>
                    </>
                  }
                >
                  <Badge color="success">{v.value.max.code}</Badge>
                </Tooltip>
              </td>
              <td>
                <Tooltip
                  arrow
                  html={
                    <>
                      <h6>{countryNames[v.value.min.code]}</h6>
                      <span>
                        <NumberFormat
                          value={v.value.min.value}
                          displayType="text"
                          thousandSeparator
                        />
                      </span>
                    </>
                  }
                >
                  <Badge color="danger">{v.value.min.code}</Badge>
                </Tooltip>
              </td>
            </tr>,
          );
        });
        this.setState({
          bestWorstCountries: result,
        });
      });
  }

  updateIndicatorInfo(event) {
    const { selectedIndicator } = this.state;
    if (event.value === -1) return;
    axios
      .get(`http://51.38.36.193:1323/indicators/${selectedIndicator}/bestworst/${event.value}`)
      .then(r => {
        const values = r.data;
        this.setState({
          indicatorInfo: values,
        });
      });
  }

  toggleModal() {
    const { modal } = this.state;
    this.setState({
      modal: !modal,
    });
  }

  render() {
    // const geographyColor = '#adb5bd';
    const {
      selectedCountry,
      countryNames,
      modal,
      result,
      indicatorSource,
      indicators,
      zoom,
      indicatorInfo,
      selectIncomeGroups,
      selectedIndicator,
      worldAvg,
      regions,
      showIncomeGroups,
      bestWorstCountries,
      showWorldAvg,
      yearsSelect,
    } = this.state;
    const selectedText = selectIncomeGroups ? 'Income group' : 'Country';
    const indicatorList = [];
    let resultPanel = null;
    if (result) {
      if (worldAvg && showWorldAvg) {
        if (selectIncomeGroups) {
          resultPanel = (
            <LineChart
              thousands=","
              legend={false}
              data={[{ name: 'World average', data: worldAvg }, ...result]}
            />
          );
        } else {
          resultPanel = (
            <LineChart
              thousands=","
              data={[
                { name: 'World average', data: worldAvg },
                { name: countryNames[selectedCountry], data: result },
              ]}
            />
          );
        }
      } else {
        resultPanel = <LineChart thousands="," legend={false} data={result} />;
      }
    }
    const indicatorInfoRanking = (
      <>
        <div className="ranking">
          <div className="rank rank-best">
            <FontAwesomeIcon icon="thumbs-up" />
            <span className="country-name">{indicatorInfo ? indicatorInfo[0].id : ''}</span>
            <span className="value">
              <NumberFormat
                displayType="text"
                value={indicatorInfo ? indicatorInfo[0].value : 0}
                thousandSeparator
              />
            </span>
          </div>
          <div className="rank rank-worst">
            <FontAwesomeIcon icon="thumbs-down" />
            <span className="country-name">{indicatorInfo ? indicatorInfo[1].id : ''}</span>
            <span className="value">
              <NumberFormat
                displayType="text"
                value={indicatorInfo ? indicatorInfo[1].value : 0}
                thousandSeparator
              />
            </span>
          </div>
        </div>
      </>
    );
    const indicatorInfoPanel = !result ? null : (
      <>
        <h2>Indicator info</h2>
        Source:{' '}
        <Tooltip title={indicatorSource.source_note} position="bottom">
          <Badge color="primary" pill className="mr-2">
            <FontAwesomeIcon icon="info" />
          </Badge>
        </Tooltip>
        <Tooltip title={indicatorSource.source_organization} position="bottom">
          <Badge color="success" pill>
            Organization
          </Badge>
        </Tooltip>
        <Select onChange={e => this.updateIndicatorInfo(e)} options={yearsSelect} />
        {indicatorInfo ? indicatorInfoRanking : ''}
      </>
    );
    if (indicators) {
      indicators.forEach(i => {
        indicatorList.push(
          <option key={i.id} value={i.id}>
            {i.indicator_name}
          </option>,
        );
      });
    }

    return (
      <>
        <h1 className="display-5 text-center head">
          COUN<span className="text-primary">TRIES</span>
        </h1>
        <div className="app">
          <div className="map-container">
            <ComposableMap
              className="map"
              style={{ width: '70%', height: '100%' }}
              projectionConfig={{ scale: 150 }}
            >
              <ZoomableGroup zoom={zoom}>
                <Geographies disableOptimization geography={Map}>
                  {(geographies, projection) =>
                    geographies.map(
                      (geography, i) =>
                        geography.properties.ISO_A3 !== 'ATA' && (
                          <Geography
                            onClick={() => this.handleClick(geography)}
                            key={i}
                            geography={geography}
                            className="country"
                            style={{
                              default: { fill: this.getCountryColor(geography.properties.ISO_A3) },
                              hover: { fill: '#6c757d' },
                              pressed: { fill: '#495057' },
                            }}
                            projection={projection}
                          />
                        ),
                    )
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
            <div className="map-control">
              <div className="mc mt-2">
                <Button
                  size="lg"
                  className="mr-3 rounded"
                  color="danger"
                  onClick={() => {
                    this.setState({ zoom: zoom / 2 });
                  }}
                >
                  <FontAwesomeIcon icon="minus" size="xs" />
                </Button>
                <p style={{ marginBottom: 0 }} className="font-italic text-light mr-3">
                  Zoom: x{zoom}
                </p>
                <Button
                  size="lg"
                  className="rounded"
                  color="success"
                  onClick={() => {
                    this.setState({ zoom: zoom * 2 });
                  }}
                >
                  <FontAwesomeIcon icon="plus" size="xs" />
                </Button>
              </div>
            </div>
          </div>
          <div className="result-container">
            <h2>Results</h2>
            {resultPanel}
            {indicatorInfoPanel}
          </div>
        </div>
        <div className="indicatorSelection">
          <Container>
            <Row>
              <Col lg="7">
                <Label for="indicatorList">Indicateur:</Label>
                <Input
                  style={{ marginBottom: '1rem' }}
                  type="select"
                  onChange={e =>
                    this.setState({
                      selectedIndicator: e.target.value,
                    })
                  }
                  id="indicatorList"
                  name="indicatorList"
                >
                  <option value="0" selected>
                    -- Select an indicator --
                  </option>
                  {indicatorList}
                </Input>
                <p>
                  Selected {selectedText}: <Badge color="primary">{this.getCountryName()}</Badge>
                </p>
                <Button
                  color="primary"
                  disabled={selectedCountry === '' || selectedIndicator <= 0}
                  onClick={() => this.testDb(selectedCountry)}
                >
                  Get values
                </Button>
                <Button color="link" onClick={this.toggleModal}>
                  Best/Worst countries for each indicator
                </Button>
                <Modal isOpen={modal} toggle={this.toggleModal}>
                  <ModalHeader toggle={this.toggleModal}>
                    Best and Worst countries per indicator
                  </ModalHeader>
                  <ModalBody>
                    <Row>
                      <Col lg="6">
                        <Select
                          placeholder="Select a year"
                          onChange={e => {
                            this.setState({ modalYear: e.value });
                          }}
                          options={yearsSelect}
                        />
                      </Col>
                      <Col lg="6">
                        <Select
                          placeholder="Select a region"
                          onChange={e => {
                            this.setState({ modalRegion: e.label });
                          }}
                          options={regions}
                        />
                      </Col>
                    </Row>
                    <div className="text-right">
                      <Button
                        color="primary"
                        className="mt-2 mb-2"
                        size="sm"
                        onClick={() => this.fetchBestWorst()}
                      >
                        Fetch data
                      </Button>
                    </div>
                    <Table style={{ overflowY: 'scroll' }}>
                      <thead>
                        <tr>
                          <th>Indicator name</th>
                          <th>Best country</th>
                          <th>Worst country</th>
                        </tr>
                      </thead>
                      <tbody>{bestWorstCountries}</tbody>
                    </Table>
                  </ModalBody>
                  <ModalFooter>
                    <Button color="secondary" onClick={this.toggleModal}>
                      Close
                    </Button>{' '}
                  </ModalFooter>
                </Modal>
              </Col>
              <Col lg="5" className="indicator-options">
                <h3>Options</h3>
                <FormGroup check>
                  <Label check>
                    <Input
                      type="checkbox"
                      checked={showWorldAvg}
                      onChange={() => this.toggleWorldAverage()}
                    />
                    World average over the years
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check>
                    <Input
                      type="checkbox"
                      checked={showIncomeGroups}
                      onChange={() => this.toggleIncomeGroups()}
                    />
                    Show income groups on map
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check>
                    <Input
                      type="checkbox"
                      checked={selectIncomeGroups}
                      onChange={() => this.toggleSelectIncomeGroups()}
                    />
                    Select income groups instead of countries
                  </Label>
                </FormGroup>
              </Col>
            </Row>
          </Container>
        </div>
      </>
    );
  }
}
