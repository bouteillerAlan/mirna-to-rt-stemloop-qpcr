import React, {ChangeEvent, ReactNode, useState} from 'react';
import {validateMirna, transformMiarnToPrimer} from '../utils/utils';
import {Button, Icon, List, Label, Container, Form, TextArea, Placeholder, Table} from 'semantic-ui-react';

interface Line {
  type: {
    name: string
    color: 'red' | 'orange' | 'yellow' | 'olive' | 'green' | 'teal' | 'blue' | 'violet' | 'purple' | 'pink' | 'brown' | 'grey' | 'black' | undefined
  }
  customName: undefined | string
  value: string
  errors: string[]
}

const App: React.FunctionComponent = () => {
  const [primerPrefix] = useState<string>('GCGGCG');
  const [primerSuffix] = useState<string>('GTCGTATCCAGTGCAGGGTCCGAGGTATTCGCACTGGATACGAC');
  const [fasta, setFasta] = useState<string>('');
  const [fastaReverse, setFastaReverse] = useState<Line[] | null>();
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * set the type of each line
   * @param {string} line the line you want to define the type
   * @return {Line['type']} the type object
   */
  function setTypeOfLine(line: string): Line['type'] {
    const header = new RegExp('^[>]{1}.*$');
    const seq = new RegExp('^[AUTGCautgc]+$');
    const com = new RegExp('^[;]{1}.*$');
    const sdl = new RegExp('^$');
    if (header.test(line)) {
      return {name: 'header', color: 'teal'};
    } else if (seq.test(line)) {
      return {name: 'sequence', color: 'violet'};
    } else if (com.test(line)) {
      return {name: 'comment', color: 'purple'};
    } else if (sdl.test(line)) {
      return {name: '', color: undefined};
    } else {
      return {name: 'unknown', color: 'grey'};
    }
  }

  /**
   * set the value of the arn
   * @param event {ChangeEvent<HTMLTextAreaElement>} the arn input event
   * @return {void} setState
   */
  function setValue(event: ChangeEvent<HTMLTextAreaElement>): void {
    const value = event.target.value;
    setFasta(value);
  }

  /**
   * handle the submit button
   * @return {void} set state
   */
  function handleSubmit(): void {
    setLoading(true);
    const arrayValues = fasta.split('\n');
    const lines: Line[] = [];

    for(const line in arrayValues) {
      // stock the current line & init error array
      let cline = arrayValues[line];
      let errors: string[] = [];
      let customName = undefined;

      // check the type
      const type = setTypeOfLine(cline);

      // if the type is a sequence transform the data
      if (type.name === 'sequence') {
        // check the format
        errors = validateMirna(cline);
        // if the format is ok transform the data
        if (errors.length === 0) {
          cline = transformMiarnToPrimer(cline, primerPrefix, primerSuffix)
        }
        // set custom name for sequence
        // parseInt is here because typescript linter consider line as a string
        const previousLine = lines[parseInt(line, 10) - 1];
        if (previousLine && previousLine.type.name === 'header') {
          customName = '_' + lines[parseInt(line, 10) - 1].value.split(' ')[0].slice(1);
        } else {
          customName = '';
        }
      }

      lines.push({
        type,
        customName,
        value: cline,
        errors
      })
    }

    setFastaReverse(lines);
    setLoading(false);
  }

  /**
   * map the color for each character
   * @param {string} value primer rt | primer qpcr | mirna
   * @return {ReactNode}
   */
  function mapColor(value: string): ReactNode {
    // lower case & array
    if (value) {
      const arrayValue = value.toUpperCase().split('');
      return (
        arrayValue.map((value: string, index: number) => (
          <React.Fragment key={index}>
            {(value === 'G') && <span className="card bg-red">G</span>}
            {(value === 'T') && <span className="card bg-yellow">T</span>}
            {(value === 'A') && <span className="card bg-orange">A</span>}
            {(value === 'C') && <span className="card bg-blue">C</span>}
          </React.Fragment>
        ))
      )
    }
  }

  return (
    <Container className="app">

      <Form>
        <TextArea rows={5} value={fasta} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setValue(event)} />
      </Form>

      <Button animated onClick={() => handleSubmit()}>
        <Button.Content visible>Transform</Button.Content>
        <Button.Content hidden>
          <Icon name='arrow right' />
        </Button.Content>
      </Button>

      {loading &&
        <Placeholder>
          <Placeholder.Line />
          <Placeholder.Line />
          <Placeholder.Line />
          <Placeholder.Line />
          <Placeholder.Line />
        </Placeholder>
      }

      <Table celled inverted selectable>
        <Table.Body>
          {(!loading && fastaReverse) && fastaReverse.map((line: Line, key:number) => (
            (line.type.name === 'sequence' && line.errors.length === 0) ?
              <React.Fragment>
                <Table.Row>
                  <Table.Cell key={key+'rt'}>
                    <Label ribbon color={line.type.color} horizontal>
                      {line.customName ? 'primerRT' + line.customName : line.type.name}
                    </Label>
                  </Table.Cell>
                  <Table.Cell>
                    {mapColor(line.value.split('-')[0])}
                  </Table.Cell>
                </Table.Row>

                <Table.Row>
                  <Table.Cell key={key+'qpcr'}>
                    <Label ribbon color={line.type.color} horizontal>
                      {line.customName ? 'primerqPCR-Fwd' + line.customName : line.type.name}
                    </Label>
                  </Table.Cell>
                  <Table.Cell>
                    {mapColor(line.value.split('-')[1])}
                  </Table.Cell>
                </Table.Row>
              </React.Fragment> :

              <Table.Row>
                <Table.Cell key={key}>
                  <Label ribbon color={line.type.color} horizontal>
                    {line.type.name}
                  </Label>
                </Table.Cell>
                <Table.Cell key={key} error={(line.type.name === 'unknown' || line.errors.length > 0)}>
                  {(line.type.name === 'unknown' || line.errors.length > 0) && <Icon name='attention' />}
                  <span className={(line.type.name === 'unknown' || line.errors.length > 0) ? 'c-red' : ''}>
                    {line.value}
                    {line.errors.length > 0 &&
                    <i>
                      {line.errors.map((value: string, index: number) => (
                        ' error(s) : ' + value + ' '
                      ))}
                    </i>
                    }
                  </span>
                </Table.Cell>
              </Table.Row>
          ))}

        </Table.Body>
      </Table>

    </Container>
  );
}

export default App;
